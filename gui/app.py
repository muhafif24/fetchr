import os
import sys
import json
import time
import threading
import http.client

# Tambahkan direktori root proyek dan folder gui ke sys.path agar impor lokal dapat diselesaikan dengan benar
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.dirname(current_dir))

import webview
import pystray
from PIL import Image
from api import Api
from utils import get_resource_path
from extension_bridge import start_bridge, get_or_create_token


def _register_protocol_handler():
    """Register fetchr:// URL protocol di Windows registry (HKCU — tanpa admin)."""
    if sys.platform != 'win32':
        return
    try:
        import winreg
        if getattr(sys, 'frozen', False):
            # Packaged exe — panggil langsung
            cmd = f'"{sys.executable}" "%1"'
        else:
            # Dev mode — jalankan via pythonw (GUI, tanpa console window)
            python_dir = os.path.dirname(sys.executable)
            pythonw = os.path.join(python_dir, 'pythonw.exe')
            exe = pythonw if os.path.exists(pythonw) else sys.executable
            script = os.path.abspath(__file__)
            cmd = f'"{exe}" "{script}" "%1"'

        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r'Software\Classes\fetchr') as k:
            winreg.SetValue(k, '', winreg.REG_SZ, 'URL:Fetchr Protocol')
            winreg.SetValueEx(k, 'URL Protocol', 0, winreg.REG_SZ, '')
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r'Software\Classes\fetchr\shell\open\command') as k:
            winreg.SetValue(k, '', winreg.REG_SZ, cmd)
        print('[Fetchr] fetchr:// protocol handler registered.')
    except Exception as e:
        print(f'[Fetchr] Warning: protocol registration failed: {e}')


def _focus_running_instance() -> bool:
    """Kirim POST /focus ke instance Fetchr yang sudah berjalan.
    Return True jika berhasil (berarti instance lain sudah di-focus — kita harus exit).
    """
    token = get_or_create_token()
    for port in range(9099, 9104):
        try:
            conn = http.client.HTTPConnection('127.0.0.1', port, timeout=0.5)
            conn.request('POST', '/focus', body=b'', headers={
                'Authorization': f'Bearer {token}',
                'Host': '127.0.0.1',
                'Content-Length': '0',
                'Content-Type': 'application/json',
            })
            resp = conn.getresponse()
            data = json.loads(resp.read())
            conn.close()
            if data.get('ok'):
                return True
        except Exception:
            pass
    return False


def _load_tray_image(icon_path):
    """Load tray icon image, fallback to a plain violet square if not found."""
    try:
        img = Image.open(icon_path).convert("RGBA")
        img = img.resize((64, 64), Image.LANCZOS)
        return img
    except Exception:
        img = Image.new("RGBA", (64, 64), (124, 58, 237, 255))
        return img


def _create_tray(window, icon_path, api):
    """Build and return a pystray Icon instance (not yet running)."""
    image = _load_tray_image(icon_path)

    def on_show(icon, item):
        window.show()

    def on_quit(icon, item):
        # Sinyal cancel ke semua download aktif agar .part file di-flush dengan bersih
        try:
            api._downloader.cancel_all()
        except Exception:
            pass
        icon.stop()
        time.sleep(1.0)  # beri waktu yt-dlp flush .part file sebelum proses mati
        os._exit(0)

    menu = pystray.Menu(
        pystray.MenuItem("Show Fetchr", on_show, default=True),
        pystray.MenuItem("Quit", on_quit),
    )

    return pystray.Icon("fetchr", image, "Fetchr", menu)


def main():
    # Single-instance: jika ada Fetchr yang sudah berjalan, fokuskan dan keluar
    if _focus_running_instance():
        print('[Fetchr] Instance lain sudah berjalan — jendela di-fokuskan. Keluar.')
        sys.exit(0)

    # Daftarkan fetchr:// protocol handler agar extension bisa auto-launch app
    _register_protocol_handler()

    # Inisialisasi API bridge
    api = Api()

    # Mode pengembangan: set env var FETCHR_DEV=1 untuk memuat live dev server Vite (HMR)
    DEV_MODE = os.environ.get("FETCHR_DEV", "0") == "1"

    if DEV_MODE:
        url_target = "http://localhost:5175"
        print(f"Memuat antarmuka pengembangan (Vite HMR) dari: {url_target}")
    else:
        url_target = get_resource_path("gui/frontend/index.html")
        if not os.path.exists(url_target):
            print(f"Error: File HTML tidak ditemukan di {url_target}")
            url_target = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "index.html"))
            if not os.path.exists(url_target):
                sys.exit(f"Fatal Error: Antarmuka HTML tidak ditemukan di {url_target}!")
        print(f"Memuat antarmuka produksi statis dari: {url_target}")

    window = webview.create_window(
        title="Fetchr",
        url=url_target,
        js_api=api,
        width=1020,
        height=720,
        min_size=(800, 600),
        background_color='#080b11'
    )

    api.set_window(window)

    # Start browser extension HTTP bridge
    bridge_port = start_bridge(api._on_bridge_url, api._on_bridge_download, lambda: window.show(), api._on_bridge_analyze)
    if bridge_port is None:
        print("[Fetchr] Warning: extension bridge gagal bind di port 9099-9103. "
              "Integrasi browser extension tidak akan tersedia.")

    # Tutup tombol X → sembunyikan ke tray, bukan keluar
    def on_closing():
        window.hide()
        return False  # batalkan penutupan default

    window.events.closing += on_closing

    # startMinimized: sembunyikan window begitu halaman selesai dimuat
    if api.get_settings().get("startMinimized", False):
        def _hide_on_load():
            window.hide()
            window.events.loaded -= _hide_on_load
        window.events.loaded += _hide_on_load

    # Siapkan tray icon
    icon_path = get_resource_path("fetchr.ico")
    tray = _create_tray(window, icon_path, api)

    # Jalankan tray di thread terpisah agar tidak memblokir webview
    tray_thread = threading.Thread(target=tray.run, daemon=True)
    tray_thread.start()

    # Jalankan GUI loop (blocking sampai os._exit dipanggil dari tray)
    webview.start(debug=DEV_MODE)


if __name__ == "__main__":
    main()
