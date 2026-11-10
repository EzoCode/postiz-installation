#!/usr/bin/env python3
"""Publier un Reel avec couverture, compte exact et reçu contre les doublons."""
import argparse
import datetime as dt
import fcntl
import hashlib
import importlib.util
import json
from pathlib import Path
import os
import sys
from urllib.parse import urlencode

import postiz_api as api

REGISTRY = Path(__file__).resolve().parent.parent / 'state' / 'receipts'


def digest(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def save(path, record):
    record['updated_at'] = dt.datetime.now(dt.timezone.utc).isoformat()
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def publish(config, video, account, caption, cover, receipt=None, preview=False, date=None, registry=REGISTRY,
            trial=None, group=None, variant=None):
    video, username, manifest = api.reel_plan(video, account, caption, date,
                                             api.request(config, 'GET', '/integrations'), trial)
    if video.suffix.lower() != '.mp4':
        raise ValueError('Cette version de Postiz exige un MP4 pour identifier le Reel.')
    cover = Path(cover).resolve(strict=True)
    if cover.suffix.lower() not in ('.jpg', '.jpeg') or not 0 < cover.stat().st_size <= 8 * 1024**2:
        raise ValueError('La couverture doit être un JPEG de 8 Mo maximum.')
    manifest['type'] = 'schedule' if date else 'now'
    identity = {'account': username, 'video_sha256': digest(video),
                'cover_sha256': digest(cover), 'caption_sha256': hashlib.sha256(caption.encode()).hexdigest()}
    registry = Path(registry).resolve()
    if receipt is None:
        receipt = registry / (username + '-' + identity['video_sha256'] + '.json')
    receipt = Path(receipt).resolve()
    if receipt.parent != registry:
        raise ValueError('Le reçu doit rester dans le registre durable du skill.')
    if preview:
        return dict(identity, preview=True, video=str(video), cover=str(cover), manifest=manifest)
    receipt = Path(receipt).resolve()
    receipt.parent.mkdir(parents=True, exist_ok=True)
    lock_path = receipt.parent / (username + '-' + identity['video_sha256'] + '.lock')
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        for existing in receipt.parent.glob('*.json'):
            if existing == receipt:
                continue
            previous = json.loads(existing.read_text())
            if (previous.get('account') == username and
                    previous.get('video_sha256') == identity['video_sha256'] and
                    previous.get('state') in ('SUBMITTING', 'SUBMITTED', 'PUBLISHED', 'SCHEDULED', 'ERROR')):
                return dict(previous, skipped=True, reason='Cette vidéo a déjà été soumise sur ce compte.')
        record = json.loads(receipt.read_text()) if receipt.exists() else dict(
            identity, state='CHECKED', sources={'video': str(video), 'cover': str(cover), 'caption': caption})
        if trial or group:
            record['essai'] = {'graduation': trial, 'groupe': group, 'variante': variant}
        if any(record.get(key) != value for key, value in identity.items()):
            raise ValueError('Ce reçu appartient à une autre vidéo, couverture, légende ou chaîne.')
        if record['state'] in ('SUBMITTING', 'SUBMITTED', 'PUBLISHED', 'SCHEDULED', 'ERROR'):
            return dict(record, skipped=True, reason='Publication déjà soumise, vérifier son état sans la recréer.')
        save(receipt, record)
        for key, path in [('video_media', video), ('cover_media', cover)]:
            if key not in record:
                media = api.request(config, 'POST', '/upload', file=path)
                if not isinstance(media, dict) or not media.get('id') or not media.get('path'):
                    raise RuntimeError('Réponse upload inattendue, aucun post soumis.')
                record[key] = {'id': media['id'], 'path': media['path']}
                save(receipt, record)
        manifest['posts'][0]['value'][0]['image'] = [dict(record['video_media'], thumbnail=record['cover_media']['path'])]
        record['manifest'] = manifest
        if digest(video) != identity['video_sha256'] or digest(cover) != identity['cover_sha256']:
            raise RuntimeError('Le média a changé pendant l’envoi, aucun post soumis.')
        record['state'] = 'SUBMITTING'
        save(receipt, record)
        try:
            record['result'] = api.request(config, 'POST', '/posts', payload=manifest)
        except Exception as error:
            record['submission_error'] = str(error)
            save(receipt, record)
            raise RuntimeError('Soumission non confirmée. Vérifier Postiz avant toute nouvelle tentative.') from error
        record['state'] = 'SUBMITTED'
        save(receipt, record)
        return record


def controle_version(group, registry=REGISTRY):
    """Une version à la fois (règle du 4/11/2026) : la suivante seulement si la précédente a ses 48 h et n'a pas gagné."""
    import subprocess
    passages = json.loads(Path(registry).parent.joinpath('passages-normaux.json').read_text())
    if group in {x['groupe'] for x in passages['faits']}:
        return [f'{group} est déjà passé en Reel normal : plus aucune version en essai']
    dates = []
    for path in Path(registry).glob('marceaumause-*.json'):
        record = json.loads(path.read_text())
        if (record.get('essai') or {}).get('groupe') == group and record.get('manifest', {}).get('date') \
                and record.get('state') in ('SUBMITTING', 'SUBMITTED', 'SCHEDULED', 'PUBLISHED'):
            dates.append(dt.datetime.fromisoformat(record['manifest']['date'].replace('Z', '+00:00')))
    if not dates:
        return []
    if dt.datetime.now(dt.timezone.utc) < max(dates) + dt.timedelta(hours=48):
        return [f'la dernière version de {group} sort le {max(dates):%d/%m %H:%M} UTC : attendre son verdict à 48 h']
    check = subprocess.run([sys.executable, str(Path(__file__).with_name('passage_normal.py')), 'gagnant', group],
                           capture_output=True, text=True)
    if check.returncode == 3:
        return [f'{group} a déjà gagné ({check.stdout.strip()}) : il passe en normal, pas de nouvelle version']
    if check.returncode:
        return [f'verdict de {group} illisible, réessayer : {check.stderr.strip()[:120]}']
    return []


def garde_depot(video, forcer=None):
    """Marceau Mause (règle du 7/11/2026, Business 012 sans SFX) : un master d'un dossier PRET-programmateur passe
    controle_depot.py (CONTROLE-QUALITE.md à jour, « SFX du hook » qui passe, « Sujet PMBA » pour Business)."""
    import subprocess
    if forcer or 'PRET-programmateur' not in str(Path(video).resolve()):
        return
    check = subprocess.run([sys.executable, str(Path.home() / 'agent-skills/controle-cadre/controle_depot.py'), str(video)],
                           capture_output=True, text=True)
    if check.returncode:
        raise ValueError(check.stdout.strip() + ' Corriger le dépôt (CRITERES-QUALITE.md, 12 ter) ; '
                         '--forcer "<raison>" seulement sur décision écrite de Marceau.')


def garde_normal(forcer=None):
    """Marceau Mause (règle du 4/11/2026) : aucun Reel Instagram normal publié en direct, un gagnant se partage sans republier."""
    if not forcer:
        raise ValueError('Reel normal refusé sur Marceau Mause : tout sort d’abord en essai (--essai manuel), et un gagnant passe seul '
                         'en normal sans republier (passage_normal.py, ~/production/orchestration/STRATEGIE-ESSAIS-20261104.md). '
                         '--forcer "<raison>" seulement sur décision écrite de Marceau.')


def garde_essai(video, date, group, registry=REGISTRY, forcer=None):
    """Reels d'essai Marceau Mause (règle du 3/11/2026) : calendrier et ressemblance, avant tout envoi."""
    import subprocess
    from zoneinfo import ZoneInfo
    if forcer:
        return
    ny = ZoneInfo('America/New_York')
    if not date:
        raise ValueError('Reel d’essai : une date programmée est obligatoire (au moins 1 h d’avance).')
    moment = dt.datetime.fromisoformat(date.replace('Z', '+00:00')).astimezone(ny)
    problems = []
    if not (dt.time(10, 0) <= moment.time() <= dt.time(19, 30)):
        problems.append('heure hors de 10 h - 19 h 30 NY')
    if group:
        problems += controle_version(group, registry)
    same_day = []
    for path in Path(registry).glob('marceaumause-*.json'):
        record = json.loads(path.read_text())
        settings = (record.get('manifest', {}).get('posts') or [{}])[0].get('settings', {})
        if not settings.get('is_trial_reel') or record.get('state') not in ('SUBMITTING', 'SUBMITTED', 'SCHEDULED', 'PUBLISHED'):
            continue
        other = dt.datetime.fromisoformat(record['manifest']['date'].replace('Z', '+00:00')).astimezone(ny)
        if other.date() == moment.date():
            same_day.append((other, (record.get('essai') or {}).get('groupe')))
    if len(same_day) >= 7:
        problems.append(f'déjà {len(same_day)} essais ce jour-là (7 au plus)')
    if group and any(g == group for _, g in same_day):
        problems.append(f'une version de {group} sort déjà ce jour-là (une par jour)')
    near = [o for o, _ in same_day if abs((o - moment).total_seconds()) < 50 * 60]
    if near:
        problems.append('moins de 50 min avec l’essai de ' + near[0].strftime('%H:%M'))
    check = subprocess.run([sys.executable, str(Path(__file__).with_name('controle_ressemblance.py')), str(video)],
                           capture_output=True, text=True)
    if check.returncode == 1:
        problems.append('ressemblance : ' + check.stdout.strip().splitlines()[0])
    if problems:
        raise ValueError('Reel d’essai refusé (règle du 3/11, ~/production/orchestration/ESSAIS-ETALES-20261103.md) : '
                         + ' ; '.join(problems) + '. Choisir une autre date, ou refaire le montage ; '
                         '--forcer "<raison>" seulement sur décision écrite.')


def verify_receipts(config, directory):
    results = []
    for receipt in Path(directory).glob('*.json'):
        record = json.loads(receipt.read_text())
        if 'video_sha256' not in record or record.get('state') == 'CHECKED':
            continue
        manifest = record['manifest']
        moment = dt.datetime.fromisoformat(manifest['date'].replace('Z', '+00:00'))
        query = urlencode({'startDate': (moment - dt.timedelta(days=1)).isoformat(),
                           'endDate': (moment + dt.timedelta(days=2)).isoformat()})
        rows = api.request(config, 'GET', '/posts?' + query)['posts']
        expected = {item['postId'] for item in record.get('result', [])}
        integration = manifest['posts'][0]['integration']['id']
        caption = manifest['posts'][0]['value'][0]['content']
        matches = [row for row in rows if row['integration']['id'] == integration and
                   (row['id'] in expected if expected else
                    row['content'] == caption and row.get('creationMethod') == 'API' and
                    row.get('publishDate', '') >= moment.isoformat()[:19])]
        if len(matches) == 1:
            row = matches[0]
            record['post_id'] = row['id']
            record['postiz_state'] = row['state']
            if row['state'] == 'PUBLISHED' and row.get('releaseId') and row.get('releaseURL'):
                record['state'] = 'PUBLISHED'
                record['instagram_id'] = row['releaseId']
                record['url'] = row['releaseURL']
            elif (manifest['type'] == 'schedule' and row['state'] == 'QUEUE' and
                  dt.datetime.fromisoformat(row['publishDate'].replace('Z', '+00:00')) == moment):
                record['state'] = 'SCHEDULED'
                record['scheduled_for'] = row['publishDate']
            elif row['state'] == 'ERROR':
                record['state'] = 'ERROR'
            save(receipt, record)
        results.append({'receipt': str(receipt), 'account': record['account'],
                        'state': record['state'], 'url': record.get('url'),
                        'post_id': record.get('post_id'), 'scheduled_for': record.get('scheduled_for')})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--verifier-recus', nargs='?', const=str(REGISTRY), help='Dossier des reçus à vérifier, aucune publication')
    parser.add_argument('--video')
    parser.add_argument('--compte', choices=list(api.ACCOUNTS))
    parser.add_argument('--legende-fichier')
    parser.add_argument('--cover')
    parser.add_argument('--recu', help='Facultatif, chemin dans le registre durable du skill')
    parser.add_argument('--date', help='Date future ISO avec fuseau, sinon publication immédiate')
    parser.add_argument('--comptes', action='store_true', help='Lister les comptes connectés, sans publier')
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--essai', choices=['manuel', 'auto'],
                        help='Reel d’essai (non-abonnés seulement) : manuel = jamais montré aux abonnés sans toi, '
                             'auto = Instagram le montre aux abonnés s’il marche')
    parser.add_argument('--groupe', help='Nom du Reel d’origine, pour classer ses variantes (variantes.py)')
    parser.add_argument('--variante', help='Étiquette de la variante, ex. hook-A')
    parser.add_argument('--forcer', metavar='RAISON', help='Passer la garde des essais (calendrier, ressemblance), raison écrite')
    args = parser.parse_args()
    if args.comptes:
        print(json.dumps(api.request(api.credentials(None), 'GET', '/integrations'), ensure_ascii=False, indent=2))
        return
    if args.verifier_recus:
        print(json.dumps(verify_receipts(api.credentials(None), args.verifier_recus), ensure_ascii=False, indent=2))
        return
    if not all([args.video, args.compte, args.legende_fichier, args.cover]):
        parser.error('Vidéo, compte, légende et couverture sont requis pour publier.')
    if api.ACCOUNTS.get(args.compte) == 'cristal.memoria':
        # 7/11 : stratégie Cristal Memoria (controle_strategie_cm.py), vérifiée aussi dans postiz_api avant le POST.
        os.environ['CM_STRATEGIE_VIDEO'] = str(Path(args.video).resolve())
        if args.forcer:
            os.environ['CM_STRATEGIE_FORCER'] = '1'
    if args.essai and api.ACCOUNTS.get(args.compte) == 'marceaumause' and not args.preview:
        garde_depot(args.video, forcer=args.forcer)
        garde_essai(args.video, args.date, args.groupe, forcer=args.forcer)
    if not args.essai and api.ACCOUNTS.get(args.compte) == 'marceaumause' and not args.preview:
        garde_normal(forcer=args.forcer)
    result = publish(api.credentials(None), args.video, args.compte,
                     Path(args.legende_fichier).read_text(), args.cover, args.recu, args.preview, args.date,
                     trial={'manuel': 'MANUAL', 'auto': 'SS_PERFORMANCE'}.get(args.essai),
                     group=args.groupe, variant=args.variante)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
