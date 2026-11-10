#!/usr/bin/env python3
"""Postiz Capserv: upload and scheduling for local agents, no dependencies."""
import argparse
import datetime as dt
import http.client
import json
import mimetypes
from pathlib import Path
import secrets
import ssl
import subprocess
import sys
from urllib.parse import urlencode, urlsplit

REMOTE_CONFIG = '/mnt/HC_Volume_106256009/postiz/agent-private.json'
ACCOUNTS = {'marceau': 'marceaumause', 'house-mascot': 'housemascot.claudette',
            'cristal-memoria': 'cristal.memoria'}


def reel_plan(file, account, caption, date, integrations, trial=None):
    """trial : None (Reel normal), 'MANUAL' ou 'SS_PERFORMANCE' (Reel d'essai)."""
    if trial not in (None, 'MANUAL', 'SS_PERFORMANCE'):
        raise ValueError('Stratégie de Reel d’essai inconnue.')
    path = Path(file).expanduser().resolve(strict=True)
    if not path.is_file() or path.suffix.lower() not in ('.mp4', '.mov') or not path.stat().st_size:
        raise ValueError('Utilise une vidéo MP4 ou MOV non vide.')
    if len(caption) > 2200:
        raise ValueError('La légende Instagram dépasse 2200 caractères.')
    username = account.lower().lstrip('@')
    username = ACCOUNTS.get(username, username)
    if username not in ACCOUNTS.values():
        raise ValueError('Ce skill couvre uniquement les trois comptes de Marceau.')
    matches = [row for row in integrations
               if row.get('identifier') == 'instagram-standalone'
               and str(row.get('profile', '')).lower().lstrip('@') == username]
    if len(matches) != 1 or matches[0].get('disabled') is not False:
        raise ValueError(f'Le compte @{username} doit être connecté et actif dans Postiz.')
    moment = dt.datetime.now(dt.timezone.utc)
    if date:
        moment = dt.datetime.fromisoformat(date.replace('Z', '+00:00'))
        if moment.tzinfo is None or moment <= dt.datetime.now(dt.timezone.utc):
            raise ValueError('Utilise une date future avec fuseau horaire explicite.')
    manifest = {'type': 'schedule' if date else 'draft',
                'date': moment.astimezone(dt.timezone.utc).isoformat(),
                'shortLink': False, 'tags': [], 'posts': [{
                    'integration': {'id': matches[0]['id']},
                    'value': [{'content': caption, 'image': []}],
                    'settings': {'__type': 'instagram-standalone', 'post_type': 'post',
                                 'is_trial_reel': trial is not None, 'collaborators': []}}]}
    if trial:
        manifest['posts'][0]['settings']['graduation_strategy'] = trial
    return path, username, manifest


def credentials(path):
    if path:
        return json.loads(Path(path).read_text())
    result = subprocess.run(['ssh', 'cap-server', 'cat', REMOTE_CONFIG],
                            capture_output=True, check=True, text=True)
    return json.loads(result.stdout)


_CRISTAL = None


def garde_strategie_cm(config, payload):
    """7/11 (Marceau, sur SO2 v10 : « c'est pas du tout ce qu'on avait dit qu'on ferait comme stratégie ») : aucun post
    Cristal Memoria sans les 6 oui de la section « Stratégie » de son CONTROLE-QUALITE.md (controle_strategie_cm.py).
    Ici, pour que TOUS les programmer_*.py et crosspost_cristal.py passent par lui. Dossier lu : CM_STRATEGIE_VIDEO
    (posé par publier.py et crosspost_cristal.py), sinon le dossier du script appelant, sinon le dossier courant."""
    global _CRISTAL
    import os, sys
    if not isinstance(payload, dict) or payload.get('type') == 'draft' or os.environ.get('CM_STRATEGIE_FORCER'):
        return
    ids = {str((p.get('integration') or {}).get('id')) for p in payload.get('posts') or []}
    if _CRISTAL is None:
        lst = _request(config, 'GET', '/integrations')
        lst = lst if isinstance(lst, list) else lst.get('integrations', [])
        _CRISTAL = {str(i.get('id')) for i in lst if 'cristal' in json.dumps(i, ensure_ascii=False).lower()}
    if not ids & _CRISTAL:
        return
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import controle_strategie_cm as C
    lieu = os.environ.get('CM_STRATEGIE_VIDEO') or str(Path(sys.argv[0]).resolve().parent if sys.argv[0] else Path.cwd())
    raisons = C.verifier(C.trouver_controle(lieu) or C.trouver_controle(Path.cwd()))
    if raisons:
        raise SystemExit('STRATÉGIE CRISTAL MEMORIA : programmation REFUSÉE (' + lieu + ')\n - ' + '\n - '.join(raisons)
                         + '\nRègle : skill cm-contenu, « Contrôle à passer avant dépôt ». Pas de contournement.')


def request(config, method, endpoint, payload=None, file=None):
    if method == 'POST' and endpoint.rstrip('/') == '/posts':
        garde_strategie_cm(config, payload)
    if file:
        from postiz_upload_guard import upload_slot
        path = Path(file).expanduser().resolve(strict=True)
        with upload_slot(path.stat().st_size):
            return _request(config, method, endpoint, payload=payload, file=path)
    return _request(config, method, endpoint, payload=payload)


def _request(config, method, endpoint, payload=None, file=None):
    url = urlsplit(config['base_url'])
    if url.scheme != 'https':
        raise ValueError('HTTPS requis pour protéger la clé API.')
    connection = http.client.HTTPSConnection(url.hostname, url.port or 443,
                                            timeout=1800, context=ssl.create_default_context())
    route = url.path.rstrip('/') + endpoint
    headers = {'Authorization': config['api_key'], 'Accept': 'application/json'}
    try:
        if file:
            path = Path(file).expanduser().resolve(strict=True)
            boundary = 'postiz' + secrets.token_hex(20)
            filename = path.name.replace('"', '_').replace('\r', '_').replace('\n', '_')
            mime = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            head = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; '
                    f'filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n').encode()
            tail = f'\r\n--{boundary}--\r\n'.encode()
            headers['Content-Type'] = f'multipart/form-data; boundary={boundary}'
            headers['Content-Length'] = str(len(head) + path.stat().st_size + len(tail))
            connection.putrequest(method, route)
            for key, value in headers.items():
                connection.putheader(key, value)
            connection.endheaders()
            connection.send(head)
            with path.open('rb') as stream:
                while chunk := stream.read(1024 * 1024):
                    connection.send(chunk)
            connection.send(tail)
        else:
            body = json.dumps(payload).encode() if payload is not None else None
            if body is not None:
                headers['Content-Type'] = 'application/json'
            connection.request(method, route, body, headers)
        response = connection.getresponse()
        raw = response.read().decode('utf-8', errors='replace')
        if response.status >= 400:
            raise RuntimeError(f'Postiz HTTP {response.status}: {raw[:1500]}')
        return json.loads(raw) if raw else None
    finally:
        connection.close()

