import os
import json
import secrets
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from utils import get_app_data_dir

APP_VERSION   = "1.3.0"
DEFAULT_PORT  = 9099

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
            tok = open(path).read().strip()
            if len(tok) == 64:
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
    except Exception:
        pass
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
            self._json(200, {"ok": True, "version": APP_VERSION})
        else:
            self.send_response(404)
            self.end_headers()

    def _valid_token(self) -> bool:
        auth = self.headers.get("Authorization", "")
        return auth.startswith("Bearer ") and auth[7:] == self.server.token

    def do_POST(self):
        if self.path != "/send-url":
            self.send_response(404)
            self.end_headers()
            return

        if not self._valid_token():
            self._json(403, {"ok": False, "error": "Invalid token"})
            return

        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length))
            url    = (body.get("url") or "").strip()
            if url and self.server.on_url:
                self.server.on_url(url)
            self._json(200, {"ok": True})
        except Exception as exc:
            self._json(500, {"ok": False, "error": str(exc)})

    def log_message(self, *_):
        pass  # silence stdout


# ── Lifecycle ──────────────────────────────────────────────────────────────────

def start_bridge(on_url_callback) -> int | None:
    """Start the bridge server. Returns the bound port, or None if all ports are taken."""
    global _server, _port

    token = get_or_create_token()

    for candidate in range(DEFAULT_PORT, DEFAULT_PORT + 5):
        try:
            srv = HTTPServer(("127.0.0.1", candidate), _Handler)
            srv.token  = token
            srv.on_url = on_url_callback
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
