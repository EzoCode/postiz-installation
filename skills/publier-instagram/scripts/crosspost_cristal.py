#!/usr/bin/env python3
"""Programme un épisode de Cristal Memoria (copie de crosspost_claudette.py, 23/10/2026) déjà envoyé sur Instagram (reçu de publier.py) sur ses autres plateformes Postiz :
YouTube, TikTok, Facebook, avec les médias déjà téléversés (jamais un second upload) et un reçu par plateforme dans
state/crossposts/cristal.memoria-<sha256>/<plateforme>.json. Réglages repris des posts CLD03-CLD05 (20/10/2026) ;
YouTube sans miniature personnalisée : les envois CLD04 et CLD05 avec `thumbnail` sont restés en ERROR, CLD03 sans est passé.
usage : crosspost_cristal.py <reçu Instagram .json> <titre> [--preview] [--sans youtube,tiktok,...]
"""
import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import postiz_api as P

ICI = Path(__file__).resolve().parent.parent
CIBLES = {  # intégrations de Cristal Memoria, relues dans /integrations le 23/10/2026
    'youtube': ('cmuygj9hu0001mv8uxpro3z3c', 'youtube'),
    'tiktok': ('cmuzuaat70001pio3udb6098e', 'tiktok'),
    'facebook': ('cmuygxnu60007mv8uhn35xdsd', 'facebook'),
}


def reglages(plateforme, titre):
    if plateforme == 'youtube':
        return {'__type': 'youtube', 'title': titre, 'type': 'public', 'selfDeclaredMadeForKids': 'no', 'tags': []}
    if plateforme == 'tiktok':
        return {'__type': 'tiktok', 'title': titre, 'privacy_level': 'PUBLIC_TO_EVERYONE', 'duet': False, 'stitch': False,
                'comment': True, 'autoAddMusic': 'no', 'brand_content_toggle': False, 'brand_organic_toggle': False,
                'video_made_with_ai': True, 'content_posting_method': 'DIRECT_POST'}
    return {'__type': 'facebook', 'title': titre, 'post_type': 'post'}


def main():
    recu_f, titre = Path(sys.argv[1]), sys.argv[2]
    apercu = '--preview' in sys.argv
    sans = set(sys.argv[sys.argv.index('--sans') + 1].split(',')) if '--sans' in sys.argv else set()
    if not 2 <= len(titre) <= 100:
        raise SystemExit('titre de 2 à 100 caractères')
    recu = json.loads(recu_f.read_text())
    if recu.get('account') != 'cristal.memoria':
        raise SystemExit('reçu d’un autre compte')
    date = recu['manifest']['date']
    if dt.datetime.fromisoformat(date) <= dt.datetime.now(dt.timezone.utc):
        raise SystemExit('la date du reçu est passée')
    contenu = recu['manifest']['posts'][0]['value'][0]['content']
    video = recu['video_media']
    import os   # 7/11 : la garde de stratégie de postiz_api lit le CONTROLE-QUALITE.md à côté du master du reçu
    os.environ.setdefault('CM_STRATEGIE_VIDEO', str((recu.get('sources') or {}).get('video') or ''))
    cfg = P.credentials(None)
    actives = {r['id']: r for r in P.request(cfg, 'GET', '/integrations')}
    dossier = ICI / 'state' / 'crossposts' / f"cristal.memoria-{recu['video_sha256']}"
    dossier.mkdir(parents=True, exist_ok=True)
    for plateforme, (integ, ident) in CIBLES.items():
        if plateforme in sans:
            print(plateforme, ': exclu (--sans), rien envoyé'); continue
        r = actives.get(integ)
        if not r or r.get('disabled') is not False or r.get('identifier') != ident:
            print(plateforme, ': intégration absente ou inactive, rien envoyé'); continue
        f = dossier / f'{plateforme}.json'
        if f.exists() and json.loads(f.read_text()).get('state') != 'PREVIEW':
            print(plateforme, ': déjà soumis, voir', f); continue
        manifeste = {'type': 'schedule', 'date': date, 'shortLink': False, 'tags': [], 'posts': [{
            'integration': {'id': integ},
            'value': [{'content': contenu, 'image': [{'id': video['id'], 'path': video['path']}]}],
            'settings': reglages(plateforme, titre)}]}
        etat = {'account': 'cristal.memoria', 'platform': plateforme, 'integration': integ, 'video_sha256': recu['video_sha256'],
                'manifest': manifeste, 'state': 'PREVIEW' if apercu else 'SUBMITTING',
                'updated_at': dt.datetime.now(dt.timezone.utc).isoformat()}
        f.write_text(json.dumps(etat, ensure_ascii=False, indent=1))
        if apercu:
            print(plateforme, json.dumps(manifeste, ensure_ascii=False)[:600]); continue
        res = P.request(cfg, 'POST', '/posts', manifeste)
        etat.update(state='SCHEDULED', result=res, updated_at=dt.datetime.now(dt.timezone.utc).isoformat())
        f.write_text(json.dumps(etat, ensure_ascii=False, indent=1))
        print(plateforme, ': programmé', json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main()
