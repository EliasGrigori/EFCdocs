#!/usr/bin/env python3
"""Método Sabiá 2.0 — servidor simples para testar na própria máquina.
Uso: python3 servir.py <porta> <pasta>      (ex.: python3 servir.py 8731 dist)"""
import functools, http.server, socketserver, sys
porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
pasta = sys.argv[2] if len(sys.argv) > 2 else '.'
class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', porta), functools.partial(Quieto, directory=pasta)) as s:
    print(f'servindo {pasta} em http://localhost:{porta}/'); s.serve_forever()
