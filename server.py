# -*- coding: utf-8 -*-
"""
Sorteador Pro - Servidor Local & Nuvem de Extração de Comentários do Instagram
Fornece extração estável e confiável via API Apify (US$ 5/mês grátis) com fallbacks inteligentes.
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

PORT = int(os.environ.get('PORT', 8000))
WEB_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_APIFY_TOKEN = 'apify_api_KCMWUXKqdbYFwoyKg7fVKbZ5U21ogw1R8577'

def get_apify_token():
    tok = os.environ.get('APIFY_TOKEN', '').strip()
    if tok:
        return tok
    local_file = os.path.join(WEB_DIR, 'apify_token.txt')
    if os.path.exists(local_file):
        try:
            with open(local_file, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if content:
                    return content
        except Exception:
            pass
    return DEFAULT_APIFY_TOKEN

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

def fetch_comments_via_apify(url_or_shortcode, token=None, max_comments=300):
    """Extrai comentários diretamente pela API profissional da Apify (US$ 5 grátis todo mês)."""
    api_token = token or get_apify_token()
    if not api_token:
        return None, "Token Apify não configurado"

    if url_or_shortcode.startswith('http'):
        target_url = url_or_shortcode.split('?')[0]
    else:
        target_url = f"https://www.instagram.com/p/{url_or_shortcode}/"

    endpoint = f"https://api.apify.com/v2/actors/apify~instagram-comment-scraper/run-sync-get-dataset-items?token={api_token}&format=json"
    payload = {
        'directUrls': [target_url],
        'resultsLimit': max_comments,
        'includeNestedComments': True
    }

    try:
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            items = json.loads(resp.read().decode('utf-8'))
            results = []
            for it in items:
                username = it.get('ownerUsername') or (it.get('owner', {}).get('username') if isinstance(it.get('owner'), dict) else '')
                text = it.get('text') or ''
                avatar = it.get('ownerProfilePicUrl') or (it.get('owner', {}).get('profile_pic_url') if isinstance(it.get('owner'), dict) else '')
                full_name = it.get('owner', {}).get('full_name') if isinstance(it.get('owner'), dict) else username

                if username:
                    results.append({
                        'username': username,
                        'text': text,
                        'avatar_url': avatar or '',
                        'full_name': full_name or username
                    })
            if results:
                return results, None
            return None, "Nenhum comentário retornado nesta publicação"
    except Exception as e:
        err_msg = str(e)
        print(f"[Apify API Error] {err_msg}")
        return None, err_msg

class SorteadorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Apify-Token')
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
            tok = get_apify_token()
            resp = json.dumps({
                'status': 'online',
                'apify_configured': bool(tok),
                'message': 'Servidor com API Apify ativa e pronto'
            }).encode('utf-8')
            self.wfile.write(resp)
            return

        if parsed.path == '/api/comments':
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [''])[0]
            token = params.get('token', [''])[0]
            self.process_comments_request(target_url, token=token)
            return

        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == '/api/session':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
            try:
                data = json.loads(body)
            except Exception:
                data = {}
            tok = data.get('apify_token', '').strip()
            if tok:
                try:
                    with open(os.path.join(WEB_DIR, 'apify_token.txt'), 'w', encoding='utf-8') as f:
                        f.write(tok)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'message': 'Token salvo com sucesso!'}).encode('utf-8'))
                    return
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
                    return
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': 'Token inválido'}).encode('utf-8'))
            return

        if parsed.path == '/api/comments':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
            try:
                data = json.loads(body)
            except Exception:
                data = {}
            target_url = data.get('url', '')
            token = data.get('token', '')
            self.process_comments_request(target_url, token=token)
            return

        self.send_response(404)
        self.end_headers()

    def process_comments_request(self, target_url, token=None):
        shortcode = extract_shortcode(target_url)
        apify_tok = token or self.headers.get('X-Apify-Token', '').strip() or get_apify_token()

        if not shortcode and not target_url:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Link do Instagram inválido. Cole um link como https://www.instagram.com/p/CODIGO/'
            }).encode('utf-8'))
            return

        clean_url = target_url or f"https://www.instagram.com/p/{shortcode}/"
        print(f"[Extraindo Comentários via Apify] URL: {clean_url}...")

        comments, last_err = fetch_comments_via_apify(clean_url, token=apify_tok)

        if comments is not None and len(comments) > 0:
            print(f"[Sucesso Apify] {len(comments)} comentários extraídos com sucesso!")
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
            print(f"[Aviso] Falha ao extrair comentários via Apify: {last_err}")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': f'Não foi possível extrair comentários automaticamente ({last_err}). Use a aba Planilha / Lista para importar os participantes!'
            }).encode('utf-8'))

def run_server():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, SorteadorHandler)
    tok = get_apify_token()
    print("=" * 60)
    print("  SORTEADOR WEB - SERVIDOR INICIADO")
    print(f"  Porta: {PORT}")
    print(f"  API Apify: {'Ativa (Token configurado)' if tok else 'Token pendente'}")
    print("  Endpoint API: /api/comments")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado com sucesso.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
