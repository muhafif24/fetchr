import os
import json
import threading
import traceback
from yt_dlp import YoutubeDL
from yt_dlp.utils import sanitize_filename
from utils import check_ffmpeg, check_js_runtime, format_size, format_duration, get_resource_path

try:
    from plyer import notification as _plyer_notification
    _PLYER_AVAILABLE = True
except ImportError:
    _PLYER_AVAILABLE = False


class _PauseDownload(Exception):
    """Raised inside the progress hook to pause a download cleanly."""


class DownloadManager:
    def __init__(self, window=None, max_concurrent=3, notify_prefs=None):
        self._window = window
        self.active_downloads = {}
        self.lock = threading.Lock()
        self._semaphore = threading.Semaphore(max_concurrent)
        self._notify_prefs = notify_prefs or {"onComplete": True, "onError": True}

    def set_window(self, window):
        self._window = window

    def set_notify_prefs(self, prefs: dict):
        self._notify_prefs = prefs

    def set_max_concurrent(self, n: int):
        self._semaphore = threading.Semaphore(max(1, n))

    def _notify(self, title: str, message: str, timeout: int = 5):
        if not _PLYER_AVAILABLE:
            return
        try:
            icon_path = get_resource_path("fetchr.ico")
            _plyer_notification.notify(
                title=title,
                message=message,
                app_name="Fetchr",
                app_icon=icon_path if os.path.exists(icon_path) else None,
                timeout=timeout,
            )
        except Exception:
            pass

    def _progress_hook(self, download_id, data):
        with self.lock:
            if download_id not in self.active_downloads:
                return
            dl = self.active_downloads[download_id]

            if dl.get("cancel_flag", False):
                raise Exception("Download cancelled by user")

            if dl.get("pause_flag", False):
                raise _PauseDownload()

            status = data.get("status")
            if status == "finished":
                dl["phase"] = dl.get("phase", 1) + 1
            phase = dl.get("phase", 1)

        payload = {
            "id": download_id,
            "status": status,
            "phase": phase,
            "progress": 0,
            "speed": "—",
            "eta": "—",
            "downloaded": "0 B",
            "total": "—",
            "isResuming": False,
            "filename": os.path.basename(data.get("filename", "")),
        }

        if status == "downloading":
            downloaded = data.get("downloaded_bytes", 0)
            total = data.get("total_bytes") or data.get("total_bytes_estimate")
            speed = data.get("speed")
            eta = data.get("eta")
            elapsed = data.get("elapsed") or 0

            if total and total > 0:
                payload["progress"] = min(int((downloaded / total) * 100), 99)
                payload["total"] = format_size(total)

            payload["downloaded"] = format_size(downloaded)

            if speed:
                payload["speed"] = f"{format_size(speed)}/s"
            if eta:
                payload["eta"] = format_duration(eta)

            # Detect resume: significant bytes already downloaded but very little time elapsed
            payload["isResuming"] = downloaded > 1_000_000 and elapsed < 2

        elif status == "finished":
            payload["progress"] = 0
            payload["speed"] = "—"
            payload["eta"] = "—"

        if self._window:
            js = f"if(window.updateDownloadProgress){{window.updateDownloadProgress({json.dumps(payload)});}}"
            self._window.evaluate_js(js)

    def _run_download(self, download_id, url, format_id, output_path, subtitle_lang=None, embed_subs=True,
                      rate_limit=None, proxy=None, cookie_file=None):
        self._semaphore.acquire()

        ffmpeg_info = check_ffmpeg()
        js_info = check_js_runtime()

        ydl_opts = {
            'outtmpl': os.path.join(output_path, '%(title)s.%(ext)s'),
            'progress_hooks': [lambda d: self._progress_hook(download_id, d)],
            'noplaylist': True,
            'continuedl': True,  # keep .part file so paused downloads can resume
        }

        if rate_limit:
            ydl_opts['ratelimit'] = rate_limit
        if proxy:
            ydl_opts['proxy'] = proxy
        if cookie_file and os.path.exists(cookie_file):
            ydl_opts['cookiefile'] = cookie_file
        if js_info["available"]:
            ydl_opts['js_runtimes'] = {js_info["runtime_key"]: {'path': js_info["path"]}}
        if ffmpeg_info["available"]:
            ydl_opts['ffmpeg_location'] = os.path.dirname(ffmpeg_info["ffmpeg_path"])

        if subtitle_lang and format_id != 'bestaudio':
            ydl_opts['writesubtitles'] = True
            ydl_opts['writeautomaticsub'] = True
            ydl_opts['subtitleslangs'] = [subtitle_lang]
            ydl_opts['subtitlesformat'] = 'srt/vtt/best'
            if embed_subs and ffmpeg_info["available"]:
                ydl_opts.setdefault('postprocessors', []).append(
                    {'key': 'FFmpegEmbedSubtitle', 'already_have_subtitle': False}
                )

        if format_id == "bestaudio":
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
            })
        elif format_id and format_id != "best":
            ydl_opts['format'] = f"{format_id}+bestaudio/best"
        else:
            ydl_opts['format'] = 'bestvideo+bestaudio/best'

        title = "Video"
        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get("title", "Video")
                ext = info.get("ext", "mp4")

                with self.lock:
                    if download_id in self.active_downloads:
                        self.active_downloads[download_id]["title"] = title

                if self._window:
                    self._window.evaluate_js(
                        f"if(window.onDownloadStarted){{window.onDownloadStarted({json.dumps(download_id)},{json.dumps(title)});}}"
                    )

                ydl.download([url])

            if self._window:
                sanitized_title = sanitize_filename(title)
                filename = f"{sanitized_title}.mp3" if format_id == "bestaudio" else f"{sanitized_title}.{ext}"
                self._window.evaluate_js(
                    f"if(window.onDownloadComplete){{window.onDownloadComplete({json.dumps(download_id)},{json.dumps(filename)});}}"
                )

            if self._notify_prefs.get("onComplete", True):
                self._notify("Download Complete", f'"{title}" finished downloading.')

        except _PauseDownload:
            # Pause: leave .part file on disk, notify frontend
            with self.lock:
                if download_id in self.active_downloads:
                    self.active_downloads[download_id]["status"] = "paused"
                    self.active_downloads[download_id]["pause_flag"] = False

            if self._window:
                pause_payload = {"id": download_id, "status": "paused", "progress": 0,
                                 "speed": "—", "eta": "—", "downloaded": "0 B", "total": "—",
                                 "isResuming": False, "phase": 1, "filename": ""}
                self._window.evaluate_js(
                    f"if(window.updateDownloadProgress){{window.updateDownloadProgress({json.dumps(pause_payload)});}}"
                )

        except Exception as e:
            error_msg = str(e)
            if "cancelled" in error_msg.lower():
                status = "cancelled"
                friendly_err = "Download cancelled by user."
            else:
                status = "error"
                friendly_err = f"Download failed: {error_msg}"
                traceback.print_exc()

            with self.lock:
                if download_id in self.active_downloads:
                    self.active_downloads[download_id]["status"] = status
                    self.active_downloads[download_id]["error"] = friendly_err

            if self._window:
                self._window.evaluate_js(
                    f"if(window.onDownloadError){{window.onDownloadError({json.dumps(download_id)},{json.dumps(friendly_err)});}}"
                )

            if status == "error" and self._notify_prefs.get("onError", True):
                self._notify("Download Failed", f'"{title}": {friendly_err}', timeout=8)

        finally:
            self._semaphore.release()
            with self.lock:
                if download_id in self.active_downloads:
                    self.active_downloads[download_id]["running"] = False

    def start_download(self, download_id, url, format_id, output_path, subtitle_lang=None, embed_subs=True,
                       rate_limit=None, proxy=None, cookie_file=None):
        thread = threading.Thread(
            target=self._run_download,
            args=(download_id, url, format_id, output_path, subtitle_lang, embed_subs,
                  rate_limit, proxy, cookie_file),
            daemon=True,
        )
        with self.lock:
            self.active_downloads[download_id] = {
                "thread": thread,
                "status": "starting",
                "running": True,
                "cancel_flag": False,
                "pause_flag": False,
                "phase": 1,
                "url": url,
                "format_id": format_id,
                "title": "Fetching video info...",
            }
        thread.start()
        return True

    def cancel_download(self, download_id):
        with self.lock:
            if download_id in self.active_downloads:
                self.active_downloads[download_id]["cancel_flag"] = True
                self.active_downloads[download_id]["status"] = "cancelling"
                return True
        return False

    def pause_download(self, download_id):
        with self.lock:
            if download_id in self.active_downloads:
                dl = self.active_downloads[download_id]
                if dl.get("running") and dl.get("status") not in ("paused", "cancelling"):
                    dl["pause_flag"] = True
                    dl["status"] = "pausing"
                    return True
        return False

    def get_status(self, download_id):
        with self.lock:
            if download_id in self.active_downloads:
                info = self.active_downloads[download_id]
                return {"id": download_id, "status": info["status"],
                        "running": info["running"], "title": info["title"]}
        return None
