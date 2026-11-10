#!/usr/bin/env python3
"""Inventorier les vidéos volontairement déposées dans Prêts à publier."""
import hashlib
import json
import os
from pathlib import Path
import time

BASE = Path('/Volumes/MarceauDepot/Montage/Publication-Instagram/Prets-a-publier')
REGISTRY = Path(__file__).resolve().parent.parent / 'state' / 'receipts'
ACCOUNTS = {'marceau': ('marceau', 'marceaumause'),
            'claudette': ('house-mascot', 'housemascot.claudette'),
            'cristal-memoria': ('cristal-memoria', 'cristal.memoria')}


def inventory(base=BASE, registry=REGISTRY):
    records = [json.loads(path.read_text()) for path in registry.glob('*.json')]
    result = []
    for directory, (alias, username) in ACCOUNTS.items():
        for path in sorted((base / directory).glob('*.mp4')):
            before = path.stat()
            if not before.st_size or time.time() - before.st_mtime < 120:
                result.append({'file': str(path), 'state': 'WRITING'})
                continue
            with path.open('rb') as stream:
                checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
            after = path.stat()
            if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
                result.append({'file': str(path), 'state': 'WRITING'})
                continue
            previous = [row for row in records if row.get('account') == username and
                        row.get('video_sha256') == checksum]
            submitted = any(row.get('state') in ('SUBMITTING', 'SUBMITTED', 'PUBLISHED', 'SCHEDULED', 'ERROR')
                            for row in previous)
            sidecars = [str(sidecar) for extension in ('.srt', '.md', '.txt')
                        if (sidecar := path.with_suffix(extension)).is_file()]
            result.append({'file': str(path), 'account': username, 'alias': alias,
                           'sha256': checksum, 'state': 'KNOWN' if submitted else 'READY',
                           'receipt': str(registry / (username + '-' + checksum + '.json')),
                           'sidecars': sidecars, 'previous': [
                               {'state': row['state'], 'url': row.get('url')}
                               for row in previous]})
    return result


if __name__ == '__main__':
    if not os.path.ismount('/Volumes/MarceauDepot'):
        raise SystemExit('SSD MarceauDepot absent, attendre son remontage.')
    print(json.dumps(inventory(), ensure_ascii=False, indent=2))
