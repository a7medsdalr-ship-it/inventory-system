"""
server.py - High-Performance Multi-Threaded Inventory Central Sync Server
Eliminates 502 Bad Gateway by handling multiple concurrent requests across devices asynchronously.
"""

import http.server
import socketserver
import json
import os
import urllib.parse
import threading

PORT = int(os.environ.get("PORT", 8080))
DB_FILE = os.path.join(os.path.dirname(__file__), 'database.json')
db_lock = threading.Lock()

class SyncHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    # Enable HTTP 1.1 keep-alive
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == '/api/data':
                with db_lock:
                    if os.path.exists(DB_FILE):
                        with open(DB_FILE, 'rb') as f:
                            content = f.read()
                    else:
                        content = b'{}'
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            
            # Default static file serving
            return super().do_GET()
        except (ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            try:
                self.send_response(500)
                self.end_headers()
            except Exception:
                pass

    def do_POST(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            if parsed.path == '/api/data':
                length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(length)
                
                # Validate JSON
                parsed_json = json.loads(body.decode('utf-8'))
                with db_lock:
                    with open(DB_FILE, 'w', encoding='utf-8') as f:
                        json.dump(parsed_json, f, ensure_ascii=False, indent=2)
                
                response_data = b'{"status":"ok","message":"Synchronized successfully"}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(response_data)))
                self.end_headers()
                self.wfile.write(response_data)
                return

            self.send_response(404)
            self.send_header('Content-Length', '0')
            self.end_headers()
        except (ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            try:
                err_bytes = json.dumps({"status":"error","message":str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(err_bytes)))
                self.end_headers()
                self.wfile.write(err_bytes)
            except Exception:
                pass

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    server = ThreadedHTTPServer(("", PORT), SyncHTTPRequestHandler)
    print(f"[*] Multi-Threaded High-Performance Server running on port {PORT}...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()
