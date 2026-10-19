#!/usr/bin/env python3
"""Tiny picture server for TV browsers.

Put images in the "pictures" folder next to this file, run:
    python3 server.py
then open the printed address in the TV's web browser.

    python3 server.py --list-only
just rewrites pictures.json (the list the page reads), for publishing online.
"""
import http.server
import json
import os
import socket
import socketserver
import sys

PORT = 8000
HERE = os.path.dirname(os.path.abspath(__file__))
PICTURES = os.path.join(HERE, "pictures")
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp")


def write_list():
    names = sorted(
        (n for n in os.listdir(PICTURES)
         if n.lower().endswith(IMAGE_EXTS) and not n.startswith(".")),
        key=str.lower,
    )
    with open(os.path.join(HERE, "pictures.json"), "w") as f:
        json.dump(names, f, indent=1)
    return names


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def do_GET(self):
        if self.path.split("?")[0] == "/pictures.json":
            body = json.dumps(write_list()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    os.makedirs(PICTURES, exist_ok=True)
    if "--list-only" in sys.argv:
        print("Wrote pictures.json with %d pictures" % len(write_list()))
        sys.exit(0)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print("Pictures folder: " + PICTURES)
        print("On the TV, open:  http://%s:%d" % (lan_ip(), PORT))
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
