import os
import json
import uuid
import urllib.request
import webbrowser
import webview
from yt_dlp import YoutubeDL
from yt_dlp.utils import sanitize_filename
from utils import check_ffmpeg, check_js_runtime, get_app_data_dir, get_settings_path, format_size, format_duration, migrate_legacy_app_data
from downloader import DownloadManager

APP_VERSION = "1.3.0"
GITHUB_REPO  = "muhafif24/Fetchr"

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
        self._ensure_history_exists()

    def set_window(self, window):
        self._window = window
        self._downloader.set_window(window)

    def _ensure_history_exists(self):
        if not os.path.exists(self._history_file):
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump([], f)

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
                _lang_names = {
                    'en': 'English', 'id': 'Indonesian', 'ja': 'Japanese',
                    'ko': 'Korean', 'zh-Hans': 'Chinese (Simplified)',
                    'zh-Hant': 'Chinese (Traditional)', 'zh': 'Chinese',
                    'es': 'Spanish', 'fr': 'French', 'de': 'German',
                    'pt': 'Portuguese', 'ru': 'Russian', 'ar': 'Arabic',
                    'hi': 'Hindi', 'th': 'Thai', 'vi': 'Vietnamese',
                    'ms': 'Malay', 'it': 'Italian', 'nl': 'Dutch',
                    'tr': 'Turkish', 'pl': 'Polish', 'uk': 'Ukrainian',
                }
                subtitles = []
                seen_codes = set()
                for code, _ in (info.get('subtitles') or {}).items():
                    if code == 'live_chat':
                        continue
                    name = _lang_names.get(code, code.upper())
                    subtitles.append({'code': code, 'name': name, 'auto': False})
                    seen_codes.add(code)
                for code, _ in (info.get('automatic_captions') or {}).items():
                    if code in seen_codes or code == 'live_chat':
                        continue
                    name = _lang_names.get(code, code.upper())
                    subtitles.append({'code': code, 'name': f'{name} (auto)', 'auto': True})
                    seen_codes.add(code)

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

    def start_download(self, url, format_id, output_path, subtitle_lang=None, embed_subs=True):
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

    def get_download_history(self):
        """
        Mengambil riwayat unduhan dari history.json.
        """
        try:
            with open(self._history_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []

    def add_to_history(self, title, url, format_label, output_dir, filename):
        """
        Menambahkan item ke berkas riwayat JSON.
        """
        try:
            history = self.get_download_history()
            
            # Format item riwayat baru
            import datetime
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            new_item = {
                "title": title,
                "url": url,
                "format": format_label,
                "date": now,
                "folder": output_dir,
                "filename": filename
            }
            
            # Batasi riwayat hanya sampai 50 item terakhir agar tidak membengkak
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
        try:
            history = self.get_download_history()
            if index < 0 or index >= len(history):
                return {"success": False, "error": "Invalid index."}
                
            item = history[index]
            
            # Jika diminta menghapus berkas fisik
            if delete_file:
                folder = item.get("folder")
                filename = item.get("filename")
                if folder and filename:
                    file_path = os.path.join(folder, filename)
                    # Fallback ke pencarian wildcard jika file dengan ekstensi asli tidak ada
                    if not os.path.exists(file_path):
                        import glob
                        base_name, _ = os.path.splitext(filename)
                        sanitized_base = sanitize_filename(base_name)
                        patterns = [
                            os.path.join(folder, f"{base_name}.*"),
                            os.path.join(folder, f"{sanitized_base}.*")
                        ]
                        for pattern in patterns:
                            matches = glob.glob(pattern)
                            valid_matches = [m for m in matches if not m.endswith('.part') and not m.endswith('.ytdl')]
                            if valid_matches:
                                file_path = valid_matches[0]
                                break
                                
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except Exception as e:
                            # Catat saja jika gagal menghapus file (misal karena terkunci)
                            print(f"Failed to delete file: {e}")
                            
            # Hapus dari list riwayat
            history.pop(index)
            
            # Simpan kembali ke JSON
            with open(self._history_file, 'w', encoding='utf-8') as f:
                json.dump(history, f, indent=4, ensure_ascii=False)
                
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
            import glob
            
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
        Buka URL di browser default sistem.
        """
        try:
            webbrowser.open(url)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
