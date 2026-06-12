import os
import glob
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
                      rate_limit=None, proxy=None, cookie_file=None, subtitle_is_auto=False):
        self._semaphore.acquire()

        ffmpeg_info = check_ffmpeg()
        js_info = check_js_runtime()

        _HEIGHT_PRESETS = {'2160', '1440', '1080', '720', '480', '360'}
        _RES_LABEL = {'360': '360p', '480': '480p', '720': '720p', '1080': '1080p', '1440': '2K', '2160': '4K'}
        # Suffix resolusi di nama file — cegah file overwrite antar resolusi berbeda
        res_suffix = f" [{_RES_LABEL[format_id]}]" if format_id in _RES_LABEL else ""

        ydl_opts = {
            'outtmpl': os.path.join(output_path, f'%(title)s{res_suffix}.%(ext)s'),
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
            # Selalu pakai writeautomaticsub — lebih kompatibel untuk auto-generated captions
            # writesubtitles hanya untuk manual subs (yang benar-benar video-provided)
            if subtitle_is_auto:
                ydl_opts['writeautomaticsub'] = True
            else:
                ydl_opts['writesubtitles'] = True
                ydl_opts['writeautomaticsub'] = True  # fallback jika manual sub tidak ada
            ydl_opts['subtitleslangs'] = [subtitle_lang]
            # Hindari 'best' — bisa download json3/srv3 yang tidak bisa di-embed FFmpeg
            ydl_opts['subtitlesformat'] = 'srt/vtt/ttml'
            ydl_opts['sleep_interval_subtitles'] = 2
            ydl_opts['retries'] = 3
            ydl_opts['fragment_retries'] = 3
            if embed_subs and ffmpeg_info["available"]:
                # WebM tidak support embedded subtitle — paksa mp4 agar embed berhasil
                ydl_opts['merge_output_format'] = 'mp4'
                ydl_opts.setdefault('postprocessors', []).append(
                    {'key': 'FFmpegEmbedSubtitle', 'already_have_subtitle': False}
                )

        if format_id == "bestaudio":
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
            })
        elif format_id in _HEIGHT_PRESETS:
            ydl_opts['format'] = f"bestvideo[height<={format_id}]+bestaudio/best"
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

                # process_info reuses already-fetched info — avoids second info-page
                # request that previously caused 429 rate limiting
                try:
                    ydl.process_info(info)
                except Exception as sub_err:
                    err_str = str(sub_err).lower()
                    # Subtitle/postprocessor error — video sudah ada di disk (download selesai
                    # sebelum embed gagal). Cukup warn; jangan re-download karena mubazir dan
                    # bisa kena rate-limit. Hindari 'ffmpeg' agar error "FFmpeg not found" tidak
                    # tersamarkan sebagai kesuksesan.
                    if subtitle_lang and any(k in err_str for k in ('subtitle', 'postprocess', 'embed', 'convert')):
                        print(f"[Fetchr] Warning: subtitle embed failed ({sub_err}), video saved without subtitles.")
                    else:
                        raise
                finally:
                    # Best-effort cleanup subtitle sisa — jalan bahkan jika error di-raise.
                    # Cover skenario: re-raised error, non-subtitle error, dan variasi lang code.
                    if embed_subs and subtitle_lang and format_id != 'bestaudio' and ffmpeg_info["available"]:
                        _base = os.path.join(output_path, f"{sanitize_filename(title)}{res_suffix}")
                        for _se in ('srt', 'vtt', 'ttml', 'ass', 'json3', 'srv3', 'srv2', 'srv1'):
                            for _sf in glob.glob(f"{_base}.*.{_se}"):
                                try:
                                    os.remove(_sf)
                                except OSError:
                                    pass

            if self._window:
                sanitized_title = sanitize_filename(title)
                if format_id == "bestaudio":
                    filename = f"{sanitized_title}.mp3"
                else:
                    # Jika embed subtitle berhasil (merge_output_format=mp4), ext jadi 'mp4'
                    actual_ext = 'mp4' if (embed_subs and subtitle_lang and format_id != 'bestaudio') else ext
                    filename = f"{sanitized_title}{res_suffix}.{actual_ext}"
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
                       rate_limit=None, proxy=None, cookie_file=None, subtitle_is_auto=False):
        thread = threading.Thread(
            target=self._run_download,
            args=(download_id, url, format_id, output_path, subtitle_lang, embed_subs,
                  rate_limit, proxy, cookie_file, subtitle_is_auto),
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

    def cancel_all(self):
        """Set cancel_flag pada semua download aktif. Dipanggil saat app mau keluar."""
        with self.lock:
            for dl in self.active_downloads.values():
                if dl.get("running"):
                    dl["cancel_flag"] = True
