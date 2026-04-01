from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from backend.optimizer_runner import ensure_optimizer, optimize


ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"


class SchedulerHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/api/health":
            ready, note = ensure_optimizer()
            self.send_json({"status": "ok", "optimizerReady": ready, "optimizerNote": note})
            return

        self.serve_static()

    def do_POST(self) -> None:
        if self.path != "/api/optimize":
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
            self.send_json(optimize(payload))
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON payload"}, status=HTTPStatus.BAD_REQUEST)
        except Exception as exc:
            self.send_json({"error": str(exc)}, status=HTTPStatus.INTERNAL_SERVER_ERROR)

    def serve_static(self) -> None:
        route = self.path.split("?", 1)[0]
        if route in ("/", ""):
            target = FRONTEND_DIR / "index.html"
        else:
            target = (FRONTEND_DIR / route.lstrip("/")).resolve()

        if not str(target).startswith(str(FRONTEND_DIR.resolve())) or not target.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "File not found")
            return

        content_type, _ = mimetypes.guess_type(str(target))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type or "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(target.read_bytes())

    def send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), SchedulerHandler)
    print(f"Optimal Course Scheduler running on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
