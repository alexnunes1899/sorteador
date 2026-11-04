# -*- coding: utf-8 -*-
"""
Sorteador Pro - Servidor Local & Nuvem de Extração de Comentários do Instagram
Executa na porta definida por PORT (8000 local / 10000 nuvem) e fornece:
1. Servidor web para a aplicação estática
2. API para extrair comentários de posts/reels do Instagram
3. Suporte a sessão autenticada (IG_SESSIONID, ig_session.txt ou header X-IG-Session) para contornar bloqueios da Meta
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

def get_ig_session_id():
    """Recupera o cookie sessionid do Instagram da variável de ambiente ou de arquivo local."""
    sid = os.environ.get('IG_SESSIONID', '').strip()
    if sid:
        return sid
    local_file = os.path.join(WEB_DIR, 'ig_session.txt')
    if os.path.exists(local_file):
        try:
            with open(local_file, 'r', encoding='utf-8') as f:
                return f.read().strip()
        except Exception:
            pass
    return ''

def find_local_session_file():
    """Procura automaticamente por arquivos de sessão salvos pelo Instaloader no computador."""
    search_dirs = [
        WEB_DIR,
        os.path.expanduser('~/.config/instaloader'),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Instaloader')
    ]
    for d in search_dirs:
        if d and os.path.exists(d):
            try:
                for fname in os.listdir(d):
                    if fname.startswith('session-'):
                        return os.path.join(d, fname)
            except Exception:
                pass
    return None

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

def fetch_comments_via_instaloader(shortcode, session_id=None, max_comments=300):
    """Extrai comentários utilizando instaloader com suporte a cookies de sessão."""
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
        
        sid = session_id or get_ig_session_id()
        if sid:
            L.context._session.cookies['sessionid'] = sid

        sess_file = find_local_session_file()
        if sess_file:
            try:
                base = os.path.basename(sess_file)
                username = base.replace('session-', '')
                L.load_session_from_file(username, sess_file)
                print(f"[Instaloader] Sessao carregada de arquivo: {sess_file}")
            except Exception as se:
                print(f"[Instaloader] Falha ao carregar {sess_file}: {se}")

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
        return results, None
    except Exception as e:
        err_msg = str(e)
        print(f"[Instaloader Error] {type(e).__name__}: {err_msg}")
        return None, err_msg

def fetch_comments_via_graphql(shortcode, session_id=None, max_comments=150):
    """Fallback via endpoint web do Instagram com suporte a cookie de sessão."""
    sid = session_id or get_ig_session_id()
    try:
        alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
        media_id = 0
        for char in shortcode:
            media_id = (media_id * 64) + alphabet.index(char)

        url = f"https://www.instagram.com/api/v1/media/{media_id}/comments/?can_support_threading=true&permalink_enabled=false"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            'X-IG-App-ID': '936619743392459',
            'X-ASBD-ID': '129477',
            'Accept': '*/*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
            'Referer': f'https://www.instagram.com/p/{shortcode}/'
        }
        if sid:
            headers['Cookie'] = f'sessionid={sid};'

        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode('utf-8'))
            raw_comments = data.get('comments', [])
            comments = []
            for c in raw_comments:
                u = c.get('user', {})
                username = u.get('username', '')
                text = c.get('text', '')
                avatar = u.get('profile_pic_url', '')
                full_name = u.get('full_name', username)
                if username:
                    comments.append({
                        'username': username,
                        'text': text,
                        'avatar_url': avatar,
                        'full_name': full_name
                    })
                    if len(comments) >= max_comments:
                        break
            if comments:
                return comments
    except Exception as e:
        print(f"[Web API Error] {e}")
    return None

class SorteadorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-IG-Session')
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
            sid = get_ig_session_id()
            has_session = bool(sid) or bool(find_local_session_file())
            resp = json.dumps({
                'status': 'online',
                'authenticated': has_session,
                'message': 'Servidor ativo e pronto'
            }).encode('utf-8')
            self.wfile.write(resp)
            return

        if parsed.path == '/api/comments':
            params = urllib.parse.parse_qs(parsed.query)
            target_url = params.get('url', [''])[0]
            session_id = params.get('sessionid', [''])[0]
            self.process_comments_request(target_url, session_id=session_id)
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
            sid = data.get('sessionid', '').strip()
            if sid:
                try:
                    with open(os.path.join(WEB_DIR, 'ig_session.txt'), 'w', encoding='utf-8') as f:
                        f.write(sid)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': True, 'message': 'Cookie sessionid salvo com sucesso!'}).encode('utf-8'))
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
            self.wfile.write(json.dumps({'success': False, 'error': 'Cookie sessionid inválido'}).encode('utf-8'))
            return

        if parsed.path == '/api/comments':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
            try:
                data = json.loads(body)
            except Exception:
                data = {}
            target_url = data.get('url', '')
            session_id = data.get('sessionid', '')
            self.process_comments_request(target_url, session_id=session_id)
            return

        self.send_response(404)
        self.end_headers()

    def process_comments_request(self, target_url, session_id=None):
        shortcode = extract_shortcode(target_url)
        sid = session_id or self.headers.get('X-IG-Session', '').strip() or get_ig_session_id()
        if not shortcode:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'Link do Instagram inválido. Cole um link como https://www.instagram.com/p/CODIGO/'
            }).encode('utf-8'))
            return

        print(f"[Extraindo Comentários] Post/Reel: {shortcode} (Sessão: {'Sim' if sid else 'Não'})...")

        # 1. Tenta Instaloader
        comments, last_err = fetch_comments_via_instaloader(shortcode, session_id=sid)

        # 2. Se falhar, tenta Web API / GraphQL
        if not comments:
            comments = fetch_comments_via_graphql(shortcode, session_id=sid)

        if comments is not None and len(comments) > 0:
            print(f"[Sucesso] {len(comments)} comentários extraídos com sucesso!")
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
            print(f"[Aviso] Não foi possível extrair comentários do post {shortcode}")
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            
            hint = "O Instagram bloqueou o acesso anônimo aos comentários deste post."
            if last_err and "Login required" in str(last_err):
                hint = "O Instagram exige sessão/login para liberar os comentários desta publicação (política anti-scraping da Meta)."

            self.wfile.write(json.dumps({
                'success': False,
                'error': f'{hint} Salve seu cookie sessionid (ou execute conectar-sessao.bat) ou use a aba Planilha / Lista para importar os participantes!'
            }).encode('utf-8'))

def run_server():
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, SorteadorHandler)
    sid = get_ig_session_id()
    sess_file = find_local_session_file()
    print("=" * 60)
    print("  SORTEADOR WEB - SERVIDOR INICIADO")
    print(f"  Porta: {PORT}")
    print(f"  Sessão Instagram: {'Ativa (Autenticado)' if (sid or sess_file) else 'Não configurada (Modo Anônimo)'}")
    print("  Endpoint API: /api/comments")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado com sucesso.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
