"""Optional local preview; the HTML can also be opened directly."""
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
ROOT=Path(__file__).resolve().parent.parent
class Preview(BaseHTTPRequestHandler):
    def do_GET(self):
        route=self.path.split('?')[0]
        if route not in ('/', '/gravity-lab.html'):
            self.send_response(204);self.end_headers();return
        data=(ROOT/'gravity-lab.html').read_bytes()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.end_headers()
        self.wfile.write(data)
ThreadingHTTPServer(('127.0.0.1',8773),Preview).serve_forever()
