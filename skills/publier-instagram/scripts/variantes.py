#!/usr/bin/env python3
"""Relever et classer les variantes d'un Reel (original + Reels d'essai) depuis Postiz.

  variantes.py groupes                 liste les groupes et leurs variantes
  variantes.py relever [--groupe X]    relève les stats Postiz, ajoute un relevé daté
  variantes.py classement --groupe X   classe les variantes par vues (dernier relevé)
"""
import argparse
import datetime as dt
import json
from pathlib import Path
import sys

import postiz_api as api

STATE = Path(__file__).resolve().parent.parent / 'state'
RECEIPTS = STATE / 'receipts'
SNAPSHOTS = STATE / 'variantes-releves.jsonl'


def grouped(group=None):
    rows = []
    for path in sorted(RECEIPTS.glob('*.json')):
        record = json.loads(path.read_text())
        essai = record.get('essai') or {}
        if not essai.get('groupe') or (group and essai['groupe'] != group):
            continue
        rows.append({'groupe': essai['groupe'], 'variante': essai.get('variante') or path.stem[-8:],
                     'essai': essai.get('graduation'), 'compte': record.get('account'),
                     'etat': record.get('state'), 'post_id': record.get('post_id'),
                     'url': record.get('url'), 'recu': path.name})
    return rows


def collect(config, group=None):
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    out = []
    for row in grouped(group):
        if row['etat'] != 'PUBLISHED' or not row['post_id']:
            out.append(dict(row, releve=None, raison='pas encore publié (lancer publier.py --verifier-recus)'))
            continue
        try:
            series = api.request(config, 'GET', f"/analytics/post/{row['post_id']}?date=30") or []
        except Exception as error:
            out.append(dict(row, releve=None, raison=str(error)[:200]))
            continue
        metrics = {}
        for item in series:
            values = [int(float(point['total'])) for point in item.get('data', []) if point.get('total') not in (None, '')]
            if values:
                metrics[item['label'].lower()] = max(values)
        snapshot = dict(row, observe_le=now, mesures=metrics)
        with SNAPSHOTS.open('a') as stream:
            stream.write(json.dumps(snapshot, ensure_ascii=False) + '\n')
        out.append(snapshot)
    return out


def ranking(group):
    latest = {}
    if SNAPSHOTS.exists():
        for line in SNAPSHOTS.read_text().splitlines():
            snap = json.loads(line)
            if snap['groupe'] == group:
                latest[snap['recu']] = snap
    rows = sorted(latest.values(), key=lambda s: s['mesures'].get('views', 0), reverse=True)
    return [{'rang': i + 1, 'variante': s['variante'], 'essai': s['essai'], 'vues': s['mesures'].get('views'),
             'comptes_touches': s['mesures'].get('reach'), 'partages': s['mesures'].get('shares'),
             'enregistrements': s['mesures'].get('saves'), 'observe_le': s['observe_le'], 'url': s['url']}
            for i, s in enumerate(rows)]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('action', choices=['groupes', 'relever', 'classement'])
    parser.add_argument('--groupe')
    args = parser.parse_args()
    if args.action == 'groupes':
        result = grouped(args.groupe)
    elif args.action == 'relever':
        result = collect(api.credentials(None), args.groupe)
    else:
        if not args.groupe:
            parser.error('--groupe requis pour le classement')
        result = ranking(args.groupe)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
