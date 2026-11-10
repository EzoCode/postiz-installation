"""Serialize Postiz uploads across agents and preserve database disk reserve."""
from contextlib import contextmanager
import json
import select
import shlex
import subprocess

RESERVE = 1024 ** 3
VOLUME = '/mnt/HC_Volume_106256009'


def required_space(size):
    if size <= 0:
        raise ValueError('Le fichier à envoyer est vide.')
    return RESERVE + 2 * size


@contextmanager
def upload_slot(size):
    needed = required_space(size)
    code = (
        'import fcntl,json,os,shutil,sys; '
        "lock=open('/run/lock/postiz-upload.lock','a'); "
        'fcntl.flock(lock,fcntl.LOCK_EX); '
        f'assert os.path.ismount({VOLUME!r}), "Volume Postiz absent"; '
        f'print(json.dumps({{"free":shutil.disk_usage({VOLUME!r}).free}}),flush=True); '
        'sys.stdin.readline()'
    )
    remote = 'timeout 2100 python3 -u -c ' + shlex.quote(code)
    process = subprocess.Popen(
        ['ssh', '-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
         '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=3',
         'cap-server', remote], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, text=True)
    try:
        if not select.select([process.stdout], [], [], 120)[0]:
            raise RuntimeError('Un autre envoi Postiz est en cours. Réessayer après sa fin.')
        line = process.stdout.readline()
        if not line:
            raise RuntimeError('Impossible de vérifier la réserve disque Postiz. Aucun envoi effectué.')
        free = json.loads(line)['free']
        if free < needed:
            raise RuntimeError(
                f'Postiz : {free / 1e9:.2f} Go libres, {needed / 1e9:.2f} Go requis '
                '(fichier, marge de transfert et réserve de 1 Gio pour les services). '
                'Aucun octet envoyé. Voir etat-postiz.md pour la maintenance.')
        if process.poll() is not None:
            raise RuntimeError('Verrou serveur perdu avant envoi.')
        yield
    finally:
        if process.stdin:
            process.stdin.close()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        process.stdout.close()
        process.stderr.close()
