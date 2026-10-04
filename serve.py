import http.server, mimetypes, socketserver, pathlib
PORT=8000
DIR=pathlib.Path(__file__).parent / "dist"
mimetypes.add_type("application/manifest+json", ".webmanifest")
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(DIR),**kw)
    def end_headers(self):
        self.send_header("Cache-Control","no-cache")
        super().end_headers()
    def do_GET(self):
        # SPA fallback: si fichier n'existe pas, servir index.html
        p = DIR / self.path.lstrip("/").split("?")[0].split("#")[0]
        if not p.exists() or p.is_dir():
            self.path="/index.html"
        return super().do_GET()
print(f"Serving {DIR} at http://localhost:{PORT}")
with socketserver.TCPServer(("",PORT),Handler) as httpd: httpd.serve_forever()
