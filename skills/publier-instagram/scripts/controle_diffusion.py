#!/usr/bin/env python3
"""Contrôle quotidien de diffusion (13 h, LaunchAgent) : tableau épisode x plateforme de la veille et du jour,
rattrapage des trous YouTube (et Facebook de Claudette et Cristal Memoria) par Postiz, rapport Markdown.

Règles (Marceau, 26/10/2026) :
- une marque n'est « finie » que si toutes ses plateformes sont programmées (IG, FB, YouTube, TikTok par Buffer) ;
- YouTube fait partie de toute diffusion, TOUJOURS en version à musique composée par nous (Marceau, 26/10 au soir :
  « les versions YouTube il faut composer la musique toi même qui match celle mise et l'émotion ») : un épisode ne part
  sur YouTube que s'il est déclaré dans state/youtube-ok.json (média et titre de la version composée). Sinon il n'est
  pas envoyé : il est signalé « version composée à fabriquer » dans le rapport. Jamais Artlist sur YouTube ;
- pas de doublon : un trou n'est comblé que si aucun post Postiz QUEUE/PUBLISHED ne porte la même légende et si la
  vidéo n'est pas déjà sur la chaîne (titre relu par yt-dlp : un ERROR Postiz peut cacher une vidéo en ligne) ;
- Facebook Marceau Mause reste bloqué (identité de la Page) : listé, jamais retenté ;
- TikTok passe par Buffer (journal buffer-posts.jsonl) : listé, jamais rattrapé ici ;
- jamais avant la première sortie Instagram de l'épisode ; au plus 2 rattrapages par jour et par chaîne ;
- créneaux : heure de New York, entre maintenant + 45 min et 20 h, une vidéo par intégration et par heure, sinon 10 h le lendemain.
usage : controle_diffusion.py [--apply] [--jours-avant N]
"""
import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path
from zoneinfo import ZoneInfo

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI))
import postiz_api as P

RACINE = ICI.parent
NY = ZoneInfo('America/New_York')
RAPPORTS = Path('~/production/orchestration/diffusion').expanduser()
BUFFER = Path('~/production/orchestration/buffer-posts.jsonl').expanduser()
MARQUES = {  # compte Instagram -> intégrations Postiz (relues et vérifiées à chaque exécution) et chaîne YouTube
    'housemascot.claudette': {'nom': 'Claudette', 'ig': 'cmuyaugyy0003rw8uo9axzfdz', 'youtube': 'cmuygxn3r0005mv8u3mz996bh',
                              'facebook': 'cmuyhxbqi0001p2b9nonqiso2', 'tiktok': 'claudette', 'chaine': '@housemascot.claudette'},
    'cristal.memoria': {'nom': 'Cristal Memoria', 'ig': 'cmuybgqsq0006rw8utxx1ru6r', 'youtube': 'cmuygj9hu0001mv8uxpro3z3c',
                        'facebook': 'cmuygxnu60007mv8uhn35xdsd', 'tiktok': 'cristal', 'chaine': '@cristal.memoria'},
    'marceaumause': {'nom': 'Marceau Mause', 'ig': 'cmuy9vncl0001rw8uimsoa02j', 'youtube': 'cmuyhkc4p0009mv8unmh4i4ji',
                     'facebook': 'cmuygplzh0003mv8u40xypvsl', 'tiktok': 'marceau', 'chaine': '@marceaumause',
                     'facebook_bloque': True},
}
OK = ('PUBLISHED', 'QUEUE')


def norm(t):
    return re.sub(r'\W+', ' ', t.lower()).strip()[:60]


def posts_postiz(cfg, jours_avant):
    now = dt.datetime.now(dt.timezone.utc)
    s = (now - dt.timedelta(days=jours_avant)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    e = (now + dt.timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    r = P.request(cfg, 'GET', f'/posts?startDate={s}&endDate={e}')
    return r['posts'] if isinstance(r, dict) else r


def titres_chaine(chaine):
    try:
        out = subprocess.run(['yt-dlp', '--flat-playlist', '--print', '%(title)s',
                              f'https://www.youtube.com/{chaine}/shorts'], capture_output=True, text=True, timeout=90).stdout
    except Exception:
        return None
    return {norm(t) for t in out.splitlines() if t.strip()}


def recus_instagram():
    res = {}
    for f in (RACINE / 'state' / 'receipts').glob('*.json'):
        try:
            r = json.loads(f.read_text())
        except Exception:
            continue
        pid = r.get('post_id') or ((r.get('result') or [{}])[0].get('postId') if isinstance(r.get('result'), list) else None)
        if pid and r.get('video_media'):
            res[pid] = r
    return res


def titre_pour(recu, contenu):
    v = Path((recu.get('sources') or {}).get('video', ''))
    for cand in (v.parent / 'titre.txt', v.parent.parent / 'titre.txt'):
        try:
            t = cand.read_text().strip()
            if 2 <= len(t) <= 100:
                return t
        except Exception:
            pass
    t = re.split(r'(?<=[.!?])\s', contenu.strip())[0]
    return t[:100]


def prochain_creneau(integ, posts, deja, maintenant, apres=None, par_jour=2):
    pris = [dt.datetime.fromisoformat(p['publishDate'].replace('Z', '+00:00')) for p in posts
            if p['integration']['id'] == integ and p['state'] in OK] + deja.get(integ, [])
    t = (max(maintenant + dt.timedelta(minutes=45), apres or maintenant)).astimezone(NY).replace(second=0, microsecond=0)
    if t.minute == 0 or t.minute == 30:
        pass
    elif t.minute < 30:
        t = t.replace(minute=30)
    else:
        t = t.replace(minute=0) + dt.timedelta(hours=1)
    while True:
        if t.hour >= 20 or t.hour < 9:
            t = (t + dt.timedelta(days=1 if t.hour >= 20 else 0)).replace(hour=10, minute=0)
        if all(abs((t - x).total_seconds()) >= 3500 for x in pris) and sum(
                1 for x in deja.get(integ, []) if x.astimezone(NY).date() == t.date()) < par_jour:
            deja.setdefault(integ, []).append(t)
            return t
        t += dt.timedelta(hours=1)


def buffer_direct():
    """Lit Buffer lui-même (pas seulement le journal local) : posts scheduled ou sent, par compte."""
    import programmer_tiktok_buffer as B
    canaux = {}
    if BUFFER.exists():
        for ligne in BUFFER.read_text().splitlines():
            try:
                j = json.loads(ligne)
            except Exception:
                continue
            if j.get('canal') and j.get('compte'):
                canaux[j['canal']] = j['compte']
    try:
        cle = B.cle()
        org = B.appel(cle, 'query { account { organizations { id } } }')['data']['account']['organizations'][0]['id']
        q = ('query($o:OrganizationId!){ posts(first:100,input:{organizationId:$o,sort:[{field:dueAt,direction:desc}]})'
             '{ edges{node{channelId dueAt status}} } }')
        noeuds = [e['node'] for e in B.appel(cle, q, {'o': org})['data']['posts']['edges']]
    except BaseException as e:  # Buffer injoignable : on retombe sur le journal, rapport honnête
        print('Buffer illisible :', str(e)[:100])
        noeuds = []
    res = [(canaux[n['channelId']], dt.datetime.fromisoformat(n['dueAt'].replace('Z', '+00:00')))
           for n in noeuds if n['channelId'] in canaux and n['status'] in ('scheduled', 'sent') and n['dueAt']]
    if not noeuds and BUFFER.exists():
        for ligne in BUFFER.read_text().splitlines():
            try:
                j = json.loads(ligne)
            except Exception:
                continue
            if j.get('buffer_id') and j.get('status') in ('scheduled', 'sent'):
                res.append((j['compte'], dt.datetime.fromisoformat(j['due'].replace('Z', '+00:00'))))
    return res


def main():
    appliquer = '--apply' in sys.argv
    jours = int(sys.argv[sys.argv.index('--jours-avant') + 1]) if '--jours-avant' in sys.argv else 1
    cfg = P.credentials(None)
    actives = {r['id']: r for r in P.request(cfg, 'GET', '/integrations')}
    maintenant = dt.datetime.now(dt.timezone.utc)
    debut = (maintenant.astimezone(NY) - dt.timedelta(days=jours)).replace(hour=0, minute=0, second=0, microsecond=0)
    posts = posts_postiz(cfg, jours + 2)
    recus = recus_instagram()
    sur = {}
    try:
        sur = json.loads((RACINE / 'state' / 'youtube-ok.json').read_text())
    except Exception:
        pass
    buffer_ = buffer_direct()
    deja, lignes, fait, reste = {}, [], [], []
    for compte, m in MARQUES.items():
        # Reels d'essai exclus : pas de copie Facebook, YouTube ni TikTok avant le choix du gagnant (Marceau, 30/10)
        episodes = [p for p in posts if p['integration']['id'] == m['ig'] and p['state'] in OK
                    and '"is_trial_reel":true' not in str(p.get('settings')).replace(' ', '')
                    and dt.datetime.fromisoformat(p['publishDate'].replace('Z', '+00:00')) >= debut.astimezone(dt.timezone.utc)]
        chaine = None
        for ep in sorted(episodes, key=lambda p: p['publishDate']):
            cle = norm(ep['content'])
            etat = {'instagram': ep['state']}
            for plateforme in ('facebook', 'youtube'):
                t_ep = dt.datetime.fromisoformat(ep['publishDate'].replace('Z', '+00:00'))
                tous = [p for p in posts if p['integration']['id'] == m[plateforme] and (
                    norm(p['content']) == cle or abs((dt.datetime.fromisoformat(p['publishDate'].replace('Z', '+00:00')) - t_ep).total_seconds()) <= 3 * 3600)]
                bon = [p for p in tous if p['state'] in OK]
                etat[plateforme] = bon[0]['state'] if bon else ('ERROR' if tous else 'ABSENT')
            t = [d for c, d in buffer_ if c == m['tiktok'] and abs((d - dt.datetime.fromisoformat(ep['publishDate'].replace('Z', '+00:00'))).total_seconds()) < 6 * 3600]
            etat['tiktok'] = 'Buffer' if t else ('ABSENT' if ep['publishDate'] >= '2026-10-24' else 'avant Buffer')
            note = []
            for plateforme in ('facebook', 'youtube'):
                if etat[plateforme] in OK:
                    continue
                if plateforme == 'facebook' and m.get('facebook_bloque'):
                    note.append('Facebook bloqué (identité de la Page), non retenté'); continue
                recu = recus.get(ep['id'])
                if not recu:
                    note.append(f'{plateforme} : pas de reçu Instagram, à traiter à la main'); continue
                reg = sur.get(recu['video_sha256']) or sur.get(f"{compte}:{cle[:40]}")
                if plateforme == 'youtube' and not (reg and reg.get('ok')):
                    note.append('YouTube bloqué : version à musique composée à fabriquer (state/youtube-ok.json)'); continue
                r = actives.get(m[plateforme])
                if not r or r.get('disabled') is not False or r.get('refreshNeeded'):
                    note.append(f'{plateforme} : intégration à reconnecter (geste de Marceau)'); reste.append(f"{m['nom']} {plateforme} : reconnexion"); continue
                if plateforme == 'youtube':
                    if chaine is None:
                        chaine = titres_chaine(m['chaine'])
                    titre = reg.get('titre') or titre_pour(recu, ep['content'])
                    if chaine and norm(titre) in chaine:
                        etat[plateforme] = 'EN LIGNE (ERROR Postiz)'; continue
                media = reg.get('media') if plateforme == 'youtube' and reg.get('media') else recu['video_media']
                quand = prochain_creneau(m[plateforme], posts, deja, maintenant,
                                         apres=dt.datetime.fromisoformat(ep['publishDate'].replace('Z', '+00:00')),
                                         par_jour=2)
                reglages = ({'__type': 'youtube', 'title': titre, 'type': 'public', 'selfDeclaredMadeForKids': 'no', 'tags': []}
                            if plateforme == 'youtube' else {'__type': 'facebook', 'title': titre_pour(recu, ep['content']), 'post_type': 'post'})
                manifeste = {'type': 'schedule', 'date': quand.astimezone(dt.timezone.utc).isoformat(), 'shortLink': False, 'tags': [],
                             'posts': [{'integration': {'id': m[plateforme]}, 'settings': reglages,
                                        'value': [{'content': ep['content'], 'image': [{'id': media['id'], 'path': media['path']}]}]}]}
                if not appliquer:
                    note.append(f'{plateforme} : à combler le {quand:%d/%m %H:%M} NY (simulation)'); continue
                dossier = RACINE / 'state' / 'crossposts' / f"{compte}-{recu['video_sha256']}"
                dossier.mkdir(parents=True, exist_ok=True)
                f = dossier / f'{plateforme}-rattrapage-{maintenant:%Y%m%d-%H%M%S}.json'
                f.write_text(json.dumps({'state': 'SUBMITTING', 'manifest': manifeste}, ensure_ascii=False, indent=1))
                try:
                    res = P.request(cfg, 'POST', '/posts', manifeste)
                    f.write_text(json.dumps({'state': 'SCHEDULED', 'manifest': manifeste, 'result': res}, ensure_ascii=False, indent=1))
                    etat[plateforme] = 'QUEUE'
                    fait.append(f"{m['nom']} {plateforme} « {titre} » programmé le {quand:%d/%m %H:%M} NY")
                    note.append(f'{plateforme} rattrapé pour le {quand:%d/%m %H:%M} NY')
                except Exception as e:
                    note.append(f'{plateforme} : échec {str(e)[:120]}'); reste.append(f"{m['nom']} {plateforme} : échec d'envoi")
            for plateforme, e in etat.items():
                if e in ('ABSENT', 'ERROR') and not any(plateforme in n and ('bloqu' in n or 'reconn' in n) for n in note):
                    if plateforme == 'tiktok':
                        reste.append(f"{m['nom']} {ep['publishDate'][:10]} TikTok absent du journal Buffer")
            if any('bloqué' in n for n in note):
                reste.append(f"{m['nom']} {ep['publishDate'][:10]} : " + ' ; '.join(n for n in note if 'bloqu' in n))
            lignes.append((m['nom'], ep['publishDate'][:16].replace('T', ' ') + ' UTC', ep['content'][:40].replace('\n', ' '), etat, note))
    RAPPORTS.mkdir(parents=True, exist_ok=True)
    jour = maintenant.astimezone(NY)
    out = [f'# Diffusion {jour:%Y-%m-%d}', '', f'Contrôle de {jour:%H:%M} NY, {"rattrapage appliqué" if appliquer else "simulation"}.', '',
           '| Marque | Instagram (date) | Épisode | IG | FB | YouTube | TikTok | Notes |', '|---|---|---|---|---|---|---|---|']
    for nom, d, titre, e, n in lignes:
        out.append(f"| {nom} | {d} | {titre} | {e['instagram']} | {e['facebook']} | {e['youtube']} | {e['tiktok']} | {' ; '.join(n)} |")
    out += ['', '## Rattrapé', *(f'- {x}' for x in fait or ['rien']), '', '## Reste bloqué', *(f'- {x}' for x in sorted(set(reste)) or ['rien'])]
    chemin = RAPPORTS / f'{jour:%Y-%m-%d}.md'
    chemin.write_text('\n'.join(out) + '\n')
    print('\n'.join(out))
    print('\nrapport :', chemin)


if __name__ == '__main__':
    main()
