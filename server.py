from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OVERRIDES = ROOT / "balance_overrides.js"


class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/save-balance":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        OVERRIDES.write_text(
            "window.BALANCE_OVERRIDES = "
            + json.dumps(data, ensure_ascii=False, indent=2)
            + ";\n",
            encoding="utf-8",
        )
        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 5176), Handler)
    print("Serving on http://0.0.0.0:5176")
    server.serve_forever()
