# -*- coding: utf-8 -*-
"""
Sorteador Pro - Servidor Local de Extração de Comentários do Instagram
Executa na porta 8000 e fornece:
1. Servidor web local para a aplicação (http://127.0.0.1:8000)
2. API local para extrair comentários de posts/reels do Instagram sem limites de terceiros
"""

import sys
import os
import re
import json
import urllib.request
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Garante suporte UTF-8 no console do Windows
if sys.platform.startswith('win'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = 8000
WEB_DIR = os.path.dirname(os.path.abspath(__file__))

def extract_shortcode(url_or_code):
    if not url_or_code:
        return ''
    m = re.search(r'(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)', url_or_code, re.I)
    if m:
        return m.group(1)
    clean = url_or_code.strip().strip('/')
    if re.match(r'^[A-Za-z0-9_-]{5,25}$', clean):
        return clean
    return ''

def fetch_comments_via_instaloader(shortcode, max_comments=300):
    """Extrai comentários utilizando a biblioteca instaloader instalada no sistema."""
    try:
        import instaloader
        L = instaloader.Instaloader(
            download_pictures=False,
            download_videos=False,
            download_video_thumbnails=False,
            download_geotags=False,
            download_comments=False,
            save_metadata=False,
            compress_json=False
        )
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        results = []
        count = 0
        for comment in post.get_comments():
            username = getattr(comment.owner, 'username', '') if comment.owner else ''
            text = comment.text or ''
            avatar_url = getattr(comment.owner, 'profile_pic_url', '') if comment.owner else ''
            full_name = getattr(comment.owner, 'full_name', '') if comment.owner else ''

            if username:
                results.append({
                    'username': username,
                    'text': text,
                    'avatar_url': avatar_url or '',
                    'full_name': full_name or username
                })
                count += 1
                if count >= max_comments:
                    break
        return results
    except Exception as e:
        print(f"[Instaloader Error] {e}")
        return None

def fetch_comments_via_graphql(shortcode, max_comments=150):
    """Fallback via endpoint GraphQL público com cabeçalhos de navegador."""
    try:
        url = (
            f"https://www.instagram.com/graphql/query/?query_hash=b3055c2e4705d69612121d0d0d1e5d36"
            f"&variables=%7B%22shortcode%22%3A%22{shortcode}%22%2C%22first%22%3A50%7D"
        )
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': f'https://www.instagram.com/p/{shortcode}/'
        })
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode('utf-8'))
            edges = data.get('data', {}).get('shortcode_media', {}).get('edge_media_to_parent_comment', {}).get('edges', [])
            comments = []
            for edge in edges:
                node = edge.get('node', {})
                user = node.get('owner', {})
                username = user.get('username', '')
                text = node.get('text', '')
                avatar = user.get('profile_pic_url', '')
                if username:
                    comments.append({
                        'username': username,
                        'text': text,
                        'avatar_url': avatar,
                        'full_name': username
                    })
            if comments:
                return comments
    except Exception as e:
        print(f"[GraphQL Error] {e}")
    return None

class SorteadorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        # Habilita CORS para requisições da própria página ou de origens locais
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            resp = json.dumps({'status': 'online', 'message': 'Servidor local ativo'}).encode('utf-8')
            self.wfile.write(resp)
            return

        if parsed.path == '/api/comments':
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [''])[0]
            self.process_comments_request(target_url)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/comments':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
            try:
                data = json.loads(body)
            except Exception:
                data = {}
            target_url = data.get('url', '')
            self.process_comments_request(target_url)
            return

        self.send_response(404)
        self.end_headers()

    def process_comments_request(self, target_url):
        shortcode = extract_shortcode(target_url)
        if not shortcode:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Link do Instagram invalido. Cole um link como https://www.instagram.com/p/CODIGO/'
            }).encode('utf-8'))
            return

        print(f"[Extraindo Comentarios] Post: {shortcode}...")

        # 1. Tenta Instaloader
        comments = fetch_comments_via_instaloader(shortcode)

        # 2. Se falhar, tenta GraphQL
        if not comments:
            comments = fetch_comments_via_graphql(shortcode)

        if comments is not None and len(comments) > 0:
            print(f"[Sucesso] {len(comments)} comentarios extraidos com sucesso!")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': True,
                'count': len(comments),
                'shortcode': shortcode,
                'comments': comments
            }).encode('utf-8'))
        else:
            print(f"[Aviso] Nao foi possivel extrair automaticamente do post {shortcode}")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Nenhum comentario publico encontrado ou o Instagram bloqueou a consulta anonima deste post. Use a aba Planilha / Lista para importar os participantes!'
            }).encode('utf-8'))

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, SorteadorHandler)
    print("=" * 60)
    print("  SORTEADOR WEB - SERVIDOR LOCAL PROPRIO INICIADO")
    print(f"  Acesse no seu navegador: http://127.0.0.1:{PORT}")
    print("  API de Comentarios ativa em: /api/comments")
    print("  Pressione CTRL+C para encerrar o servidor.")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado com sucesso.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
