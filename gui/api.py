import os
import ssl
import json
import uuid
import zipfile
import threading
import datetime
import glob
import urllib.request
import urllib.error
import webbrowser
import webview
from yt_dlp import YoutubeDL
from yt_dlp.utils import sanitize_filename
from utils import check_ffmpeg, check_js_runtime, get_app_data_dir, get_settings_path, get_ffmpeg_appdata_dir, get_extension_dir, format_size, format_duration, migrate_legacy_app_data
from extension_bridge import get_or_create_token, regenerate_token, get_active_port
from downloader import DownloadManager
from version import APP_VERSION

GITHUB_REPO = "muhafif24/Fetchr"

# ── Subtitle language lookup ──────────────────────────────────────────────────
_LANG_NAMES = {
    'af': 'Afrikaans', 'sq': 'Albanian', 'am': 'Amharic',
    'ar': 'Arabic', 'hy': 'Armenian', 'az': 'Azerbaijani',
    'eu': 'Basque', 'be': 'Belarusian', 'bn': 'Bengali',
    'bs': 'Bosnian', 'bg': 'Bulgarian', 'ca': 'Catalan',
    'zh': 'Chinese', 'zh-Hans': 'Chinese (Simplified)',
    'zh-Hant': 'Chinese (Traditional)', 'zh-TW': 'Chinese (Taiwan)',
    'hr': 'Croatian', 'cs': 'Czech', 'da': 'Danish',
    'nl': 'Dutch', 'en': 'English', 'et': 'Estonian',
    'fil': 'Filipino', 'fi': 'Finnish', 'fr': 'French',
    'gl': 'Galician', 'ka': 'Georgian', 'de': 'German',
    'el': 'Greek', 'gu': 'Gujarati', 'ha': 'Hausa',
    'he': 'Hebrew', 'iw': 'Hebrew', 'hi': 'Hindi',
    'hu': 'Hungarian', 'is': 'Icelandic', 'ig': 'Igbo',
    'id': 'Indonesian', 'ga': 'Irish', 'it': 'Italian',
    'ja': 'Japanese', 'jv': 'Javanese', 'kn': 'Kannada',
    'kk': 'Kazakh', 'km': 'Khmer', 'ko': 'Korean',
    'ku': 'Kurdish', 'ky': 'Kyrgyz', 'lo': 'Lao',
    'lv': 'Latvian', 'lt': 'Lithuanian', 'lb': 'Luxembourgish',
    'mk': 'Macedonian', 'mg': 'Malagasy', 'ms': 'Malay',
    'ml': 'Malayalam', 'mt': 'Maltese', 'mi': 'Maori',
    'mr': 'Marathi', 'mn': 'Mongolian', 'my': 'Burmese',
    'ne': 'Nepali', 'no': 'Norwegian', 'ny': 'Nyanja',
    'ps': 'Pashto', 'fa': 'Persian', 'pl': 'Polish',
    'pt': 'Portuguese', 'pt-BR': 'Portuguese (Brazil)',
    'pt-PT': 'Portuguese (Portugal)', 'pa': 'Punjabi',
    'ro': 'Romanian', 'ru': 'Russian', 'sm': 'Samoan',
    'sr': 'Serbian', 'sn': 'Shona', 'sd': 'Sindhi',
    'si': 'Sinhala', 'sk': 'Slovak', 'sl': 'Slovenian',
    'so': 'Somali', 'st': 'Sesotho', 'es': 'Spanish',
    'su': 'Sundanese', 'sw': 'Swahili', 'sv': 'Swedish',
    'tg': 'Tajik', 'ta': 'Tamil', 'te': 'Telugu',
    'th': 'Thai', 'tr': 'Turkish', 'tk': 'Turkmen',
    'uk': 'Ukrainian', 'ur': 'Urdu', 'uz': 'Uzbek',
    'vi': 'Vietnamese', 'cy': 'Welsh', 'xh': 'Xhosa',
    'yi': 'Yiddish', 'yo': 'Yoruba', 'zu': 'Zulu',
}
_LANG_PRIORITY = [
    'en', 'id', 'ms', 'zh', 'zh-Hans', 'zh-Hant', 'es', 'fr',
    'de', 'ja', 'ko', 'ar', 'pt', 'pt-BR', 'ru', 'hi', 'th',
    'vi', 'tr', 'it', 'nl', 'pl', 'uk', 'bn', 'fa', 'sw', 'fil',
]
_LANG_PRIORITY_RANK = {c: i for i, c in enumerate(_LANG_PRIORITY)}

DEFAULT_SETTINGS = {
    "outputDir": os.path.join(os.path.expanduser("~"), "Downloads"),
    "defaultFormat": "best",
    "subtitleLang": "en",
    "embedSubs": True,
    "startMinimized": False,
    "concurrentDownloads": 3,
    "rateLimit": "",
    "proxy": "",
    "cookieFile": "",
    "notify": {
        "onComplete": True,
        "onError": True,
    },
}

class Api:
    def __init__(self):
        self._window = None
        migrate_legacy_app_data()
        self._settings = self._load_settings()
        self._downloader = DownloadManager(
            max_concurrent=self._settings.get("concurrentDownloads", DEFAULT_SETTINGS["concurrentDownloads"]),
            notify_prefs=self._settings.get("notify", DEFAULT_SETTINGS["notify"]),
        )
        self._history_file = os.path.join(get_app_data_dir(), "history.json")
        self._history_lock = threading.Lock()
        self._ensure_history_exists()

    def set_window(self, window):
        self._window = window
        self._downloader.set_window(window)

    def _ensure_history_exists(self):
        if not os.path.exists(self._history_file):
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump([], f)

    def _read_history_locked(self) -> list:
        """Baca history.json — HARUS dipanggil di dalam _history_lock."""
        try:
            with open(self._history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def _delete_file_for_item(self, item: dict):
        """Hapus file fisik untuk satu history item jika ada."""
        folder = item.get("folder")
        filename = item.get("filename")
        if not folder or not filename:
            return
        file_path = os.path.join(folder, filename)
        if not os.path.exists(file_path):
            base_name, _ = os.path.splitext(filename)
            sanitized_base = sanitize_filename(base_name)
            for pattern in [
                os.path.join(folder, f"{base_name}.*"),
                os.path.join(folder, f"{sanitized_base}.*"),
            ]:
                matches = [m for m in glob.glob(pattern)
                           if not m.endswith('.part') and not m.endswith('.ytdl')]
                if matches:
                    file_path = matches[0]
                    break
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Failed to delete file: {e}")

    def _load_settings(self):
        try:
            with open(get_settings_path(), 'r', encoding='utf-8') as f:
                saved = json.load(f)
            # Deep merge: defaults di-override oleh nilai yang tersimpan
            merged = dict(DEFAULT_SETTINGS)
            merged.update(saved)
            merged["notify"] = {**DEFAULT_SETTINGS["notify"], **saved.get("notify", {})}
            return merged
        except Exception:
            return dict(DEFAULT_SETTINGS)

    # API Methods exposed to JavaScript:

    def get_settings(self):
        """Mengembalikan settings saat ini ke frontend."""
        return self._settings

    def save_settings(self, settings):
        """
        Menyimpan settings dari frontend ke disk dan menerapkannya ke runtime.
        settings: dict yang dikirim dari JS.
        """
        try:
            # Merge ke defaults agar tidak ada key yang hilang
            merged = dict(DEFAULT_SETTINGS)
            merged.update(settings)
            merged["notify"] = {**DEFAULT_SETTINGS["notify"], **settings.get("notify", {})}
            self._settings = merged

            with open(get_settings_path(), 'w', encoding='utf-8') as f:
                json.dump(merged, f, indent=2, ensure_ascii=False)

            # Terapkan perubahan ke downloader tanpa restart
            self._downloader.set_max_concurrent(merged.get("concurrentDownloads", DEFAULT_SETTINGS["concurrentDownloads"]))
            self._downloader.set_notify_prefs(merged.get("notify", DEFAULT_SETTINGS["notify"]))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_system_status(self):
        """
        Memeriksa status dependensi sistem (FFmpeg dan JS runtime).
        """
        ffmpeg_status = check_ffmpeg()
        js_status = check_js_runtime()
        
        default_download_dir = os.path.join(os.path.expanduser('~'), 'Downloads')
        if not os.path.exists(default_download_dir):
            default_download_dir = os.path.expanduser('~')

        return {
            "ffmpeg": {
                "available": ffmpeg_status["available"],
                "source": ffmpeg_status["source"],
                "ffmpeg_path": ffmpeg_status["ffmpeg_path"]
            },
            "js_runtime": {
                "available": js_status["available"],
                "name": js_status["name"],
                "path": js_status["path"]
            },
            "default_dir": default_download_dir
        }

    def select_folder(self):
        """
        Membuka dialog pemilihan folder sistem native Windows.
        """
        if not self._window:
            return None
        
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if result and len(result) > 0:
            return result[0]
        return None

    def select_file(self, file_types=None):
        """Membuka dialog pemilihan file (untuk cookie file, dll.)."""
        if not self._window:
            return None
        result = self._window.create_file_dialog(
            webview.OPEN_DIALOG,
            file_types=file_types or ('All Files (*.*)',),
        )
        if result and len(result) > 0:
            return result[0]
        return None

    def download_ffmpeg(self):
        """
        Start FFmpeg on-demand download in a background thread.
        Progress is pushed to JS via window.onFfmpegProgress(percent, status).
        Completion is pushed via window.onFfmpegComplete(success, errorOrNull).
        """
        if not self._window:
            return {"success": False, "error": "Window not ready."}
        thread = threading.Thread(target=self._ffmpeg_download_worker, daemon=True)
        thread.start()
        return {"success": True}

    def _ffmpeg_download_worker(self):
        FFMPEG_URL = (
            "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/"
            "ffmpeg-master-latest-win64-gpl.zip"
        )
        ffmpeg_dir = get_ffmpeg_appdata_dir()
        zip_path = os.path.join(ffmpeg_dir, "ffmpeg_setup.zip")

        def push(percent, status="downloading"):
            if self._window:
                self._window.evaluate_js(
                    f"if(window.onFfmpegProgress){{window.onFfmpegProgress({json.dumps(percent)},{json.dumps(status)});}}"
                )

        def done(success, error=None):
            if self._window:
                self._window.evaluate_js(
                    f"if(window.onFfmpegComplete){{window.onFfmpegComplete({json.dumps(success)},{json.dumps(error)});}}"
                )

        def _make_ssl_ctx():
            ctx = ssl.create_default_context()
            try:
                import certifi
                ctx = ssl.create_default_context(cafile=certifi.where())
            except ImportError:
                pass
            return ctx

        try:
            os.makedirs(ffmpeg_dir, exist_ok=True)
            push(0)

            ctx = _make_ssl_ctx()
            req = urllib.request.Request(
                FFMPEG_URL,
                headers={"User-Agent": f"Fetchr/{APP_VERSION}"}
            )
            try:
                response = urllib.request.urlopen(req, context=ctx, timeout=120)
            except (ssl.SSLError, urllib.error.URLError):
                # urllib membungkus SSLError dalam URLError — buat context baru tanpa verifikasi
                fallback_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
                fallback_ctx.check_hostname = False
                fallback_ctx.verify_mode = ssl.CERT_NONE
                response = urllib.request.urlopen(req, context=fallback_ctx, timeout=120)

            total = int(response.headers.get('Content-Length', 0) or 0)
            downloaded = 0
            with open(zip_path, 'wb') as f:
                while True:
                    chunk = response.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        push(min(int(downloaded * 100 / total), 95))
            response.close()

            push(96, "extracting")

            with zipfile.ZipFile(zip_path, 'r') as z:
                for name in z.namelist():
                    if name.endswith("ffmpeg.exe") or name.endswith("ffprobe.exe"):
                        data = z.read(name)
                        dest = os.path.join(ffmpeg_dir, os.path.basename(name))
                        with open(dest, 'wb') as f:
                            f.write(data)

            os.remove(zip_path)
            push(100, "done")
            done(True)
        except Exception as e:
            try:
                if os.path.exists(zip_path):
                    os.remove(zip_path)
            except Exception:
                pass
            done(False, str(e))

    def get_playlist_info(self, url):
        """
        Mengekstrak daftar video dari URL playlist (flat extraction — cepat, tanpa download).
        """
        if not url:
            return {"success": False, "error": "URL cannot be empty."}

        js_info = check_js_runtime()
        ffmpeg_info = check_ffmpeg()

        ydl_opts = {
            'extract_flat': True,
            'quiet': True,
            'noplaylist': False,
        }
        if js_info["available"]:
            ydl_opts['js_runtimes'] = {js_info["runtime_key"]: {'path': js_info["path"]}}
        if ffmpeg_info["available"]:
            ydl_opts['ffmpeg_location'] = os.path.dirname(ffmpeg_info["ffmpeg_path"])

        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            if info.get('_type') != 'playlist':
                return {"success": False, "error": "URL is not a valid playlist."}

            entries = [e for e in (info.get('entries') or []) if e]
            return {
                "success": True,
                "title": info.get('title', 'Playlist'),
                "uploader": info.get('uploader') or info.get('channel', ''),
                "count": len(entries),
                "entries": [
                    {
                        "index": i + 1,
                        "id": e.get('id', ''),
                        "title": e.get('title') or f"Video {i + 1}",
                        "url": e.get('url') or e.get('webpage_url') or f"https://www.youtube.com/watch?v={e.get('id','')}",
                        "duration": format_duration(e.get('duration') or 0),
                    }
                    for i, e in enumerate(entries)
                ],
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_video_info(self, url):
        """
        Mengekstrak metadata video (judul, thumbnail, format yang tersedia).
        """
        if not url:
            return {"success": False, "error": "URL cannot be empty."}

        # Cek status dependensi
        ffmpeg_info = check_ffmpeg()
        js_info = check_js_runtime()

        ydl_opts = {
            'noplaylist': True,  # Abaikan playlist untuk kecepatan analisis video tunggal
        }
        if js_info["available"]:
            ydl_opts['js_runtimes'] = {js_info["runtime_key"]: {'path': js_info["path"]}}
        if ffmpeg_info["available"]:
            ydl_opts['ffmpeg_location'] = os.path.dirname(ffmpeg_info["ffmpeg_path"])

        try:
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                # Saring format yang berguna (video dengan audio, video saja, audio saja)
                formats = []
                
                # Masukkan opsi default "Terbaik (Otomatis)"
                formats.append({
                    "id": "best",
                    "label": "Best Quality (Auto)",
                    "ext": "mp4 / mkv",
                    "size": "Auto"
                })

                formats.append({
                    "id": "bestaudio",
                    "label": "Audio Only (MP3 192kbps)",
                    "ext": "mp3",
                    "size": "Varies"
                })

                # Parsing format video yang tersedia dari yt-dlp
                raw_formats = info.get("formats", [])
                
                # Kita saring beberapa opsi resolusi populer (1080p, 720p, 480p, 360p)
                _res_labels = {
                    2160: "4K Ultra HD (2160p)",
                    1440: "2K QHD (1440p)",
                    1080: "1080p Full HD",
                    720:  "720p HD",
                    480:  "480p",
                    360:  "360p",
                }
                seen_heights = set()
                sorted_formats = sorted(
                    [f for f in raw_formats if f.get('height') and f.get('vcodec') != 'none'],
                    key=lambda x: x.get('height', 0),
                    reverse=True
                )

                for f in sorted_formats:
                    height = f.get('height')
                    if height in _res_labels and height not in seen_heights:
                        seen_heights.add(height)
                        filesize = f.get('filesize') or f.get('filesize_approx')
                        size_str = format_size(filesize) if filesize else "Size unknown"
                        formats.append({
                            "id": f.get('format_id'),
                            "label": f"{_res_labels[height]} (Video + Audio)",
                            "ext": f.get('ext', 'mp4'),
                            "size": size_str
                        })

                # Extract available subtitle languages
                subtitles = []
                seen_codes = set()

                # Manual subtitles first (always shown, video-provided)
                for code, _ in (info.get('subtitles') or {}).items():
                    if code == 'live_chat':
                        continue
                    name = _LANG_NAMES.get(code, code)
                    subtitles.append({'code': code, 'name': name, 'auto': False})
                    seen_codes.add(code)

                # Auto-generated captions — all available languages, sorted by priority
                auto_entries = []
                for code, _ in (info.get('automatic_captions') or {}).items():
                    if code in seen_codes or code == 'live_chat':
                        continue
                    name = _LANG_NAMES.get(code, code)
                    auto_entries.append({'code': code, 'name': f'{name} (auto)', 'auto': True})
                    seen_codes.add(code)

                auto_entries.sort(key=lambda x: (_LANG_PRIORITY_RANK.get(x['code'], 999), x['code']))
                subtitles.extend(auto_entries)

                return {
                    "success": True,
                    "title": info.get("title", "Untitled Video"),
                    "thumbnail": info.get("thumbnail", ""),
                    "duration": format_duration(info.get("duration", 0)),
                    "uploader": info.get("uploader", "Unknown"),
                    "formats": formats,
                    "subtitles": subtitles,
                }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def start_download(self, url, format_id, output_path, subtitle_lang=None, embed_subs=True, subtitle_is_auto=False):
        """
        Memulai proses pengunduhan.
        """
        if not url or not output_path:
            return {"success": False, "error": "Missing required parameters."}

        if not os.path.exists(output_path):
            try:
                os.makedirs(output_path)
            except Exception as e:
                return {"success": False, "error": f"Failed to create output folder: {str(e)}"}

        download_id = str(uuid.uuid4())

        # Mulai pengunduhan asinkron, sertakan opsi jaringan dari settings
        success = self._downloader.start_download(
            download_id, url, format_id, output_path, subtitle_lang, embed_subs,
            rate_limit=self._settings.get("rateLimit", "") or None,
            proxy=self._settings.get("proxy", "") or None,
            cookie_file=self._settings.get("cookieFile", "") or None,
            subtitle_is_auto=subtitle_is_auto,
        )
        
        if success:
            return {"success": True, "download_id": download_id}
        else:
            return {"success": False, "error": "Failed to start download task."}

    def cancel_download(self, download_id):
        """
        Membatalkan pengunduhan berjalan.
        """
        success = self._downloader.cancel_download(download_id)
        return {"success": success}

    def pause_download(self, download_id):
        """Pause a running download. The .part file is kept on disk so it can be resumed."""
        success = self._downloader.pause_download(download_id)
        return {"success": success}

    # ── Browser Extension Bridge ───────────────────────────────────────────────

    def get_bridge_token(self):
        """Return the current bridge token for the browser extension."""
        return get_or_create_token()

    def regenerate_bridge_token(self):
        """Generate a new bridge token. Extension must be reconfigured with the new token."""
        return {"success": True, "token": regenerate_token()}

    def get_bridge_port(self):
        """Return the active bridge port (default 9099)."""
        return get_active_port() or 9099

    def get_extension_dir(self):
        """Return the path to the browser extension folder."""
        return get_extension_dir()

    def get_app_version(self):
        """Return the current app version string."""
        return APP_VERSION

    def _on_bridge_url(self, url: str):
        """Called by extension_bridge when a URL arrives from the browser extension."""
        if self._window:
            self._window.show()
            self._window.evaluate_js(
                f"if(window.onReceiveUrl){{window.onReceiveUrl({json.dumps(url)});}}"
            )

    def _on_bridge_download(self, url: str, format_id: str):
        """Called by extension_bridge for POST /download — mulai unduhan langsung
        dengan format preset. Routing lewat frontend agar muncul & ter-track di UI."""
        if self._window:
            self._window.show()
            self._window.evaluate_js(
                f"if(window.onReceiveDownload){{window.onReceiveDownload({json.dumps(url)},{json.dumps(format_id)});}}"
            )

    def _on_bridge_analyze(self, url: str) -> list:
        """Called by extension_bridge for POST /analyze — return format list nyata untuk URL."""
        try:
            result = self.get_video_info(url)
            if result.get("success"):
                return result.get("formats", [])
        except Exception:
            pass
        return []

    def get_download_history(self):
        """
        Mengambil riwayat unduhan dari history.json.
        """
        with self._history_lock:
            return self._read_history_locked()

    def add_to_history(self, title, url, format_label, output_dir, filename):
        """
        Menambahkan item ke berkas riwayat JSON.
        """
        with self._history_lock:
            try:
                history = self._read_history_locked()
                now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                new_item = {
                    "title": title,
                    "url": url,
                    "format": format_label,
                    "date": now,
                    "folder": output_dir,
                    "filename": filename
                }
                history.insert(0, new_item)
                history = history[:50]
                with open(self._history_file, 'w', encoding='utf-8') as f:
                    json.dump(history, f, indent=4, ensure_ascii=False)
                return True
            except Exception as e:
                print(f"Failed to save history: {e}")
                return False

    def delete_history_item(self, index, delete_file):
        """
        Menghapus item riwayat berdasarkan indeksnya.
        Jika delete_file = True, hapus juga file video fisiknya dari disk.
        """
        with self._history_lock:
            try:
                history = self._read_history_locked()
                if index < 0 or index >= len(history):
                    return {"success": False, "error": "Invalid index."}

                item = history[index]

                if delete_file:
                    self._delete_file_for_item(item)

                history.pop(index)
                with open(self._history_file, 'w', encoding='utf-8') as f:
                    json.dump(history, f, indent=4, ensure_ascii=False)
                return {"success": True}
            except Exception as e:
                return {"success": False, "error": str(e)}

    def clear_history(self, delete_files=False):
        """
        Hapus seluruh riwayat unduhan dalam satu operasi atomik.
        Jika delete_files = True, hapus juga file fisiknya dari disk.
        """
        with self._history_lock:
            try:
                history = self._read_history_locked()
                if delete_files:
                    for item in history:
                        self._delete_file_for_item(item)
                with open(self._history_file, 'w', encoding='utf-8') as f:
                    json.dump([], f)
                return {"success": True}
            except Exception as e:
                return {"success": False, "error": str(e)}

    def open_folder(self, folder_path):
        """
        Membuka folder penyimpanan di File Explorer Windows.
        """
        if not folder_path or not os.path.exists(folder_path):
            return {"success": False, "error": "Folder not found."}
        
        try:
            os.startfile(os.path.normpath(folder_path))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def open_ffmpeg_folder(self):
        """Buka folder %APPDATA%\\Fetchr\\bin\\ di File Explorer (buat jika belum ada)."""
        ffmpeg_dir = get_ffmpeg_appdata_dir()
        os.makedirs(ffmpeg_dir, exist_ok=True)
        try:
            os.startfile(os.path.normpath(ffmpeg_dir))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def play_video(self, folder_path, filename):
        """
        Memutar video hasil unduhan menggunakan pemutar media default Windows.
        """
        if not folder_path or not filename:
            return {"success": False, "error": "Missing required parameters."}
            
        # Pengecekan path asli langsung
        file_path = os.path.join(folder_path, filename)
        
        if not os.path.exists(file_path):
            # Coba cari nama berkas yang disanitasi
            sanitized_name = sanitize_filename(filename)
            file_path = os.path.join(folder_path, sanitized_name)
            
        # Jika masih belum ditemukan (misal karena perbedaan ekstensi pasca-merging oleh FFmpeg),
        # kita lakukan pencarian berbasis wildcard (glob) pada nama basis berkas
        if not os.path.exists(file_path):
            # Ambil nama basis tanpa ekstensi
            base_name, _ = os.path.splitext(filename)
            sanitized_base = sanitize_filename(base_name)
            
            # Pola pencarian wildcard
            patterns = [
                os.path.join(folder_path, f"{base_name}.*"),
                os.path.join(folder_path, f"{sanitized_base}.*")
            ]
            
            found = False
            for pattern in patterns:
                matches = glob.glob(pattern)
                # Filter agar tidak mencocokkan file part temporer yt-dlp (.part, .ytdl)
                valid_matches = [m for m in matches if not m.endswith('.part') and not m.endswith('.ytdl')]
                if valid_matches:
                    file_path = valid_matches[0]
                    found = True
                    break
                    
            if not found:
                return {"success": False, "error": "Video file not found."}
            
        try:
            os.startfile(os.path.normpath(file_path))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def check_for_update(self):
        """
        Cek versi terbaru dari GitHub Releases API.
        Mengembalikan info update jika tersedia.
        """
        try:
            api_url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
            req = urllib.request.Request(api_url, headers={"User-Agent": f"Fetchr/{APP_VERSION}"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode())

            latest_tag = data.get("tag_name", "").lstrip("vV")
            if not latest_tag:
                return {"success": False, "has_update": False, "error": "No release tag found."}

            def _parse(v):
                parts = []
                for x in v.split("."):
                    try:
                        parts.append(int(x))
                    except ValueError:
                        parts.append(0)
                return tuple(parts)

            has_update = _parse(latest_tag) > _parse(APP_VERSION)
            return {
                "success": True,
                "has_update": has_update,
                "current_version": APP_VERSION,
                "latest_version": latest_tag,
                "release_name": data.get("name") or f"v{latest_tag}",
                "release_url": data.get("html_url", ""),
            }
        except Exception as e:
            return {"success": False, "has_update": False, "error": str(e)}

    def open_url(self, url):
        """
        Buka URL di browser default sistem. Hanya http/https yang diizinkan.
        """
        try:
            from urllib.parse import urlparse
            if urlparse(url).scheme not in ('http', 'https'):
                return {"success": False, "error": "Only http/https URLs are allowed."}
            webbrowser.open(url)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
