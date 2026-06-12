import os
import json
import secrets
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from utils import get_app_data_dir
from version import APP_VERSION

DEFAULT_PORT = 9099
_PORT_SCAN_COUNT = 5    # jumlah port yang dicoba: 9099–9103
_TOKEN_HEX_LENGTH = 64  # panjang token hex = secrets.token_hex(32)

_server   = None
_port     = None
_tok_cache = None


# ── Token ─────────────────────────────────────────────────────────────────────

def _token_path() -> str:
    return os.path.join(get_app_data_dir(), "bridge_token.txt")


def get_or_create_token() -> str:
    global _tok_cache
    if _tok_cache:
        return _tok_cache
    path = _token_path()
    try:
        if os.path.exists(path):
            with open(path, 'r') as f:
                tok = f.read().strip()
            if len(tok) == _TOKEN_HEX_LENGTH:
                _tok_cache = tok
                return tok
    except Exception:
        pass
    return _new_token()


def regenerate_token() -> str:
    new = _new_token()
    if _server:
        _server.token = new
    return new


def _new_token() -> str:
    global _tok_cache
    tok = secrets.token_hex(32)
    try:
        path = _token_path()
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(tok)
    except Exception as e:
        print(f"[Fetchr] Warning: could not persist bridge token ({e}). "
              "Token will reset on next restart.")
    _tok_cache = tok
    return tok


# ── HTTP handler ───────────────────────────────────────────────────────────────

class _Handler(BaseHTTPRequestHandler):

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json(self, code: int, body: dict):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/status":
            if not self._guard():
                return
            self._json(200, {"ok": True, "version": APP_VERSION})
        else:
            self.send_response(404)
            self.end_headers()

    # ── Pemeriksaan keamanan (defense-in-depth) ────────────────────────────────

    def _valid_host(self) -> bool:
        """Hanya terima Host loopback — cegah serangan DNS rebinding."""
        host = self.headers.get("Host", "")
        return host.split(":")[0] in ("127.0.0.1", "localhost")

    def _allowed_origin(self) -> bool:
        """Tolak request yang berasal dari halaman web (http/https).
        Browser SELALU melampirkan Origin pada cross-origin fetch dari web page,
        dan JS tidak bisa memalsukannya — jadi situs jahat otomatis ter-block.
        Extension mengirim origin chrome-extension://moz-extension:// (atau kosong)."""
        origin = self.headers.get("Origin", "")
        if not origin:
            return True
        return not (origin.startswith("http://") or origin.startswith("https://"))

    def _guard(self) -> bool:
        """Gabungan host + origin. Balas 403 & return False jika ditolak."""
        if not self._valid_host() or not self._allowed_origin():
            self._json(403, {"ok": False, "error": "Forbidden"})
            return False
        return True

    def _valid_token(self) -> bool:
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        # Perbandingan timing-safe — cegah token ditebak via timing attack
        return secrets.compare_digest(auth[7:], self.server.token)

    # Preset format yang diizinkan dari extension (whitelist — cegah injeksi)
    ALLOWED_FORMATS = {"best", "bestaudio", "2160", "1440", "1080", "720", "480", "360"}

    def do_POST(self):
        if self.path not in ("/send-url", "/download", "/focus", "/analyze"):
            self.send_response(404)
            self.end_headers()
            return

        if not self._guard():
            return

        if not self._valid_token():
            self._json(403, {"ok": False, "error": "Invalid token"})
            return

        # /focus — bawa app window ke foreground
        if self.path == "/focus":
            if self.server.on_focus:
                self.server.on_focus()
            self._json(200, {"ok": True})
            return

        # /analyze — fetch format yang tersedia untuk URL (blocking, ~2-5s)
        if self.path == "/analyze":
            try:
                length = int(self.headers.get("Content-Length", 0))
                body   = json.loads(self.rfile.read(length))
                url    = (body.get("url") or "").strip()
                if not url:
                    self._json(400, {"ok": False, "error": "Missing url"})
                    return
                if self.server.on_analyze:
                    formats = self.server.on_analyze(url)
                    self._json(200, {"ok": True, "formats": formats})
                else:
                    self._json(503, {"ok": False, "error": "Analyze not available"})
            except Exception as exc:
                self._json(500, {"ok": False, "error": str(exc)})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length))
            url    = (body.get("url") or "").strip()
            if not url:
                self._json(400, {"ok": False, "error": "Missing url"})
                return

            if self.path == "/send-url":
                # Lempar URL ke app untuk dianalisa user
                if self.server.on_url:
                    self.server.on_url(url)
            else:  # /download — mulai unduhan langsung dgn format preset
                fmt = (body.get("format") or "best").strip()
                if fmt not in self.ALLOWED_FORMATS:
                    fmt = "best"
                if self.server.on_download:
                    self.server.on_download(url, fmt)

            self._json(200, {"ok": True})
        except Exception as exc:
            self._json(500, {"ok": False, "error": str(exc)})

    def log_message(self, *_):
        pass  # silence stdout


# ── Lifecycle ──────────────────────────────────────────────────────────────────

def start_bridge(on_url_callback, on_download_callback=None, on_focus_callback=None, on_analyze_callback=None) -> int | None:
    """Start the bridge server. Returns the bound port, or None if all ports are taken.

    on_url_callback(url)              — dipanggil untuk POST /send-url
    on_download_callback(url, format) — dipanggil untuk POST /download (opsional)
    """
    global _server, _port

    token = get_or_create_token()

    for candidate in range(DEFAULT_PORT, DEFAULT_PORT + _PORT_SCAN_COUNT):
        try:
            srv = ThreadingHTTPServer(("127.0.0.1", candidate), _Handler)
            srv.token       = token
            srv.on_url      = on_url_callback
            srv.on_download = on_download_callback
            srv.on_focus    = on_focus_callback
            srv.on_analyze  = on_analyze_callback
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            _server, _port = srv, candidate
            return candidate
        except OSError:
            continue

    return None


def get_active_port() -> int | None:
    return _port


def stop_bridge():
    global _server, _port
    if _server:
        _server.shutdown()
        _server = _port = None
