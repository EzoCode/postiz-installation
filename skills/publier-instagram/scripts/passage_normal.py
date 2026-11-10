#!/usr/bin/env python3
"""Marceau Mause : passe en Reel normal les essais gagnants, sans republier (Marceau, 4/11/2026).
Geste : « Partager avec tout le monde » dans l'app, par droid. Preuve : is_shared_to_feed = true par l'API (le bouton reste affiché dans l'app).
Règle : ~/production/orchestration/STRATEGIE-ESSAIS-20261104.md. Lancé par launchd (com.marceau.passage-normal).
  passage_normal.py plan      dit ce qui passerait, sans rien toucher
  passage_normal.py lancer    passe le prochain gagnant si le créneau le permet, puis arrête l'émulateur
  passage_normal.py prechauffe  démarre l'émulateur 15 min avant un passage, s'il y a un gagnant à passer"""
import datetime as dt, glob, json, os, re, subprocess, sys, time
from pathlib import Path
from zoneinfo import ZoneInfo

ICI = Path(__file__).resolve().parent
ETAT = ICI.parent / 'state' / 'passages-normaux.json'
PRECHAUFFE = ICI.parent / 'state' / 'emulateur-prechauffe-par-passage'
RECUS = ICI.parent / 'state' / 'receipts'
ORCH = Path.home() / 'production' / 'orchestration'
JOURNAL = ORCH / 'PASSAGES-NORMAUX.md'
NY = ZoneInfo('America/New_York')
VUES, RET3, MOY, AGE_H = 1000, 60, 12, 48
# 7/11 : 3 par jour (créneaux 10 h 15, 14 h 15, 18 h 45, toujours 4 h d'écart). Marceau, 7/11 19 h 05 : « tu as encore oublié
# de poster les vidéos qui ont fonctionné ». À 2 par jour avec des échecs d'écran, la file des gagnants ne se vidait plus.
PAR_JOUR, ECART_H, ESSAIS_MAX = 3, 4, 3
SERVEUR = r"""
const {PrismaClient}=require('/app/node_modules/@prisma/client');const G='https://graph.instagram.com/v21.0/';
(async()=>{const db=new PrismaClient();try{
 const ps=await db.post.findMany({where:{deletedAt:null,state:'PUBLISHED',publishDate:{gte:new Date(Date.now()-45*864e5)},integration:{name:{contains:'Marceau'},providerIdentifier:{startsWith:'instagram'}}},select:{id:true,releaseId:true,releaseURL:true,publishDate:true,settings:true,integration:{select:{token:true}}}});
 const h={authorization:'Bearer '+ps[0].integration.token};const media={};let u=G+'me/media?fields=id,permalink,is_shared_to_feed&limit=100',n=0;
 while(u&&n++<3){const r=await(await fetch(u,{headers:h})).json();for(const m of r.data||[])media[m.permalink.split('/')[4]]=m.is_shared_to_feed;u=r.paging&&r.paging.next;}
 const out=[];for(const p of ps){if(!/is_trial_reel"?\s*:\s*true/.test(String(p.settings||''))||!p.releaseId||SKIP.has(p.id))continue;const m={};
  for(const q of ['views','ig_reels_avg_watch_time','reels_skip_rate']){const r=await(await fetch(`${G}${p.releaseId}/insights?metric=${q}`,{headers:h})).json();for(const d of r.data||[])m[d.name]=d.values&&d.values[0]&&d.values[0].value;}
  out.push({id:p.id,url:p.releaseURL,date:p.publishDate.toISOString(),vues:m.views,moy:m.ig_reels_avg_watch_time!=null?m.ig_reels_avg_watch_time/1000:null,ret3:m.reels_skip_rate!=null?100-m.reels_skip_rate:null});}
 process.stdout.write(JSON.stringify({media,posts:out}));
}finally{await db.$disconnect();}})();
"""


def serveur(skip):
    code = 'const SKIP=new Set(%s);' % json.dumps(sorted(skip)) + SERVEUR
    r = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', 'cap-server', 'docker exec -i postiz node -'],
                       input=code.encode(), capture_output=True, timeout=540)
    if r.returncode:
        raise SystemExit(r.stderr.decode()[:400])
    return json.loads(r.stdout)


def code_url(url):
    return url.rstrip('/').split('/')[-1]


def recus():
    """id Postiz -> (groupe, variante), lu dans les reçus de publier.py."""
    out = {}
    for f in glob.glob(str(RECUS / '*.json')):
        try:
            texte = open(f).read()
            e = json.loads(texte).get('essai') or {}
        except Exception:
            continue
        for i in set(re.findall(r'cm[a-z0-9]{20,}', texte)):
            out[i] = (e.get('groupe'), e.get('variante'))
    return out


def noter(ligne):
    with open(JOURNAL, 'a') as f:
        f.write(f'- {dt.datetime.now(NY):%d/%m %H:%M} NY : {ligne}\n')


NEWS_AVANT_CRITERE = {'NEWS002', 'NEWS003', 'NEWS005'}
MESURES_SFX = ORCH / 'a-valider' / 'business' / 'MESURES-SFX-20261107.md'


def sfx_hook_passe(groupe):
    """8/11, Programmateur V10, décision d'Orchestre Marceau 6 : business-016 est passé en normal sans mesure du hook
    (critère 12 ter), après 012 le 7/11. Un Business ou un News ne passe que s'il a une ligne « SFX du hook … passe »
    dans a-valider/business/MESURES-SFX-20261107.md ou dans le CONTROLE-QUALITE.md d'un de ses dépôts."""
    # 8/11 10 h 40, Orchestre Marceau 6 : NEWS002 C, NEWS005, NEWS003 maintenus (sortis avant le critère) ; garde sur Business seulement.
    # 8/11 20 h, Orchestre Marceau 8 (relayé par Pilote News 4) : NEWS006 (43 % audibles) ne passe pas tel quel ; la garde
    # vaut aussi pour News, sauf les trois gagnants sortis avant le critère et maintenus par Orchestre 6 à 10 h 40.
    if (groupe or '').upper() in NEWS_AVANT_CRITERE:
        return True
    m = re.match(r'(?i)(business|news)-?0*(\d+)', groupe or '')
    if not m:
        return True
    chaine, num = m[1].lower(), int(m[2])
    motif = re.compile(rf'(?i)(?<!\d)0*{num}(?!\d)')
    # 8/11 10 h 45 : controle_sfx_hook.py durci (bruitages audibles sur au moins 50 % du hook). Un « passe » d'avant ne compte
    # plus : la ligne doit montrer « bruitages audibles X s sur Y (Z %) » avec Z >= 50 (Orchestre Marceau 6).
    def bonne(l):
        z = re.search(r'(?i)bruitages audibles\s+[\d.,]+\s*s\s+sur\s+[\d.,]+\s*s?\s*\(\s*([\d.,]+)\s*%\s*\)', l)
        return bool(z and float(z[1].replace(',', '.')) >= 50 and re.search(r'(?i)\bpasse\b', l) and not re.search(r'(?i)refus', l))
    if chaine == 'business':
        try:
            for l in MESURES_SFX.read_text().splitlines():
                if motif.search(l) and bonne(l):
                    return True
        except OSError:
            pass
    racine = ORCH / 'a-valider' / chaine
    for cq in glob.glob(str(racine / '*' / 'PRET-programmateur' / 'CONTROLE-QUALITE.md')):
        dossier = Path(cq).parent.parent.name
        if not re.match(rf'(?i)(news|business)?0*{num}(?!\d)', dossier.replace('Business', '').replace('NEWS', '')):
            continue
        try:
            if any(bonne(l) for l in Path(cq).read_text().splitlines()):
                return True
        except OSError:
            pass
    return False


def plan(etat, d, carte):
    """Gagnant le mieux vu de chaque vidéo, sans défaut connu d'abord."""
    now = dt.datetime.now(dt.timezone.utc)
    faits = {x['groupe'] for x in etat['faits']}
    # Déjà partagé sans reçu (API en retard, geste à la main) : la vidéo est finie, jamais une 2e version.
    faits |= {carte[p['id']][0] for p in d['posts'] if p['id'] in carte and d['media'].get(code_url(p['url'] or 'x/x')) is True}
    par = {}
    for p in d['posts']:
        g = carte.get(p['id'], (None, None))
        if not g[0] or g[0] in faits or g[0] in etat['exclus']:
            continue
        p['groupe'], p['variante'] = g
        age = (now - dt.datetime.fromisoformat(p['date'].replace('Z', '+00:00'))).total_seconds() / 3600
        retenu = etat['retenus'].get(g[0])
        if retenu and now < dt.datetime.fromisoformat(retenu).astimezone(dt.timezone.utc):
            continue
        if d['media'].get(code_url(p['url'] or 'x/x')) is True:
            continue
        if not sfx_hook_passe(g[0]):
            continue
        if age >= AGE_H and (p.get('vues') or 0) >= VUES and (p.get('ret3') or 0) >= RET3 and (p.get('moy') or 0) >= MOY:
            if g[0] not in par or p['vues'] > par[g[0]]['vues']:
                par[g[0]] = p
    return sorted(par.values(), key=lambda p: (p['groupe'] in etat['defauts'], -p['vues']))


def droid(*a, timeout=40):
    return subprocess.run(['/opt/homebrew/bin/droid', *a], capture_output=True, text=True, timeout=timeout).stdout


def telephone_pris():
    """8/11, V11 : ne pas arrêter le téléphone sous une autre session (hooks-app ou une commande droid en cours)."""
    moi = str(os.getpid())
    for l in subprocess.run(['ps', '-axo', 'pid=,command='], capture_output=True, text=True).stdout.splitlines():
        pid, _, cmd = l.strip().partition(' ')
        if pid == moi or '_veille' in cmd:
            continue
        if 'hooks-app' in cmd or '/opt/homebrew/bin/droid' in cmd or 'droid/droid.py' in cmd:
            return cmd[:120]


def arreter_telephone():
    """8/11, décision d'Orchestre Marceau 6 : l'émulateur ne reste pas allumé entre deux passages (RAM et disque)."""
    pris = telephone_pris()
    if pris:
        return print('émulateur laissé en marche, utilisé par :', pris)
    try:
        r = droid('arrete', timeout=180).strip()
    except Exception as e:
        r = f'arrêt impossible ({e})'
        noter(f'ALERTE : émulateur pas arrêté après le passage : {r}.')
    PRECHAUFFE.unlink(missing_ok=True)
    print('émulateur :', r)


def a_passer(etat, now):
    """Gagnants que lancer() essaierait (mêmes règles d'échecs)."""
    file = plan(etat, serveur(etat['clos']), recus())
    return [p for p in file if not (etat['echecs'].get(p['id'], 0) >= ESSAIS_MAX
                                    and etat.get('echecs_le', {}).get(p['id']) == now.date().isoformat())]


def prechauffe(etat):
    """Lancé par launchd (com.marceau.passage-normal-prechauffe) 15 min avant 10 h 15, 14 h 15, 18 h 45."""
    now = dt.datetime.now(NY)
    dates = [dt.datetime.fromisoformat(x['le']) for x in etat['faits']]
    if sum(x.astimezone(NY).date() == now.date() for x in dates) >= PAR_JOUR:
        return print('prechauffe : déjà', PAR_JOUR, 'passages aujourd’hui, émulateur laissé arrêté')
    if not a_passer(etat, now):
        return print('prechauffe : aucun gagnant à passer, émulateur laissé arrêté')
    try:
        if 'arrêté' not in droid('etat', timeout=60):
            return print('prechauffe : émulateur déjà en marche')
        print('prechauffe :', droid('demarre', timeout=330).strip())
        PRECHAUFFE.write_text(now.isoformat())
        for _ in range(10):
            e = droid('etat', timeout=60).strip()
            if e and 'arrêté' not in e:
                return print('prechauffe : prêt,', e.splitlines()[0])
            time.sleep(15)
    except Exception as e:
        return noter(f'ALERTE prechauffe : émulateur pas prêt ({e}). Le passage le redémarrera lui-même.')
    noter('ALERTE prechauffe : droid etat ne répond pas après le démarrage. Le passage le redémarrera lui-même.')


def appuyer(url):
    # 5/11 : deux échecs sur Business 013 alors que le compte était bon. Sur un téléphone gelé ou un Mac chargé,
    # le panneau peut ne pas être ouvert au moment de lire l'écran. On attend le panneau et on refait le geste.
    # 5/11 : l'émulateur était arrêté à 10 h 15, toutes les commandes échouaient sans bruit. On le démarre d'abord.
    # 8/11 : 14 h 15 et 18 h 45, NEWS005 a échoué sur « droid etat timed out after 30 seconds » : le lsof de droid
    # bloque tant que MarceauCode gèle. On patiente jusqu'à 6 min avant de compter un échec.
    for attente in range(6):
        try:
            e = droid('etat', timeout=60)
            break
        except subprocess.TimeoutExpired:
            if attente == 5:
                raise
            time.sleep(10)
    if 'arrêté' in e:
        droid('demarre', timeout=300)
    erreur = None
    for essai in range(3):
        droid('sh', f"am start -a android.intent.action.VIEW -d '{url}' -p com.instagram.android")
        # 7/11 : Instagram affiche aussi « Reel d’essai · Voir les statistiques » : 012 a échoué sur ce libellé,
        # et sur la fenêtre « Instagram isn't responding » quand le Mac est chargé.
        if 'aerr_close' in droid('arbre'):
            droid('tape', 'Close app')
            droid('pause', '3')
            droid('sh', f"am start -a android.intent.action.VIEW -d '{url}' -p com.instagram.android")
        droid('attends', 'marceaumause', '--ms', '60000', timeout=90)
        droid('pause', '3')
        ecran = droid('arbre')
        droid('tape', next((t for t in ('Statistiques d’essai', 'Voir les statistiques') if t in ecran), 'Statistiques d’essai'))
        droid('attends', 'Partager avec tout le monde', '--ms', '20000', timeout=40)
        arbre = droid('arbre')
        m = re.search(r'"Partager avec tout le monde" #bb_primary_action_container \((\d+),(\d+)\)', arbre)
        if 'marceaumause' in arbre and m:
            droid('tape', m[1], m[2])
            droid('pause', '3')
            droid('touche', 'retour')
            return
        erreur = 'écran sans le compte marceaumause' if 'marceaumause' not in arbre else 'bouton introuvable'
        droid('touche', 'retour')
        droid('pause', '5')
    raise RuntimeError(erreur)


def lancer(etat):
    now = dt.datetime.now(NY)
    if not (10 <= now.hour and (now.hour, now.minute) < (19, 30)):
        return print('hors créneau, 10 h à 19 h 30 NY')
    dates = [dt.datetime.fromisoformat(x['le']) for x in etat['faits']]
    if sum(x.astimezone(NY).date() == now.date() for x in dates) >= PAR_JOUR:
        return print('déjà', PAR_JOUR, 'passages aujourd’hui')
    # 7/11, V9 : marge de 10 min, sinon 14 h 15 est refusé quand 10 h 15 a démarré quelques secondes plus tard.
    if dates and (now - max(dates)).total_seconds() < ECART_H * 3600 - 600:
        return print('moins de', ECART_H, 'h depuis le dernier passage')
    if subprocess.run(['pgrep', '-f', 'hooks-app'], capture_output=True).returncode == 0:
        return print('téléphone occupé par hooks-app, créneau suivant')
    d = serveur(etat['clos'])
    carte = recus()
    file = plan(etat, d, carte)
    # Un essai de 72 h ou plus qui n'a pas gagné ne bouge plus : on ne le relit pas.
    n = dt.datetime.now(dt.timezone.utc)
    for p in d['posts']:
        age = (n - dt.datetime.fromisoformat(p['date'].replace('Z', '+00:00'))).total_seconds() / 3600
        if age >= 96 and p['id'] not in {q['id'] for q in file} and not (p.get('vues') or 0) >= VUES:
            etat['clos'].append(p['id'])
    sauver(etat)
    # 7/11 : 3 échecs un jour ne condamnent plus un gagnant pour toujours (012 a gagné le 4e jour, après une remise à la main).
    # Le compteur repart à zéro le lendemain du dernier échec.
    for i, le in list(etat.setdefault('echecs_le', {}).items()):
        if dt.date.fromisoformat(le) < now.date() and etat['echecs'].get(i, 0) >= ESSAIS_MAX:
            etat['echecs'][i] = 0
    tente = [False]
    try:
        return passer(etat, file, carte, now, tente)
    finally:
        # 8/11 : arrêt après chaque passage tenté, ou si la préchauffe l'a démarré pour rien.
        if tente[0] or PRECHAUFFE.exists():
            arreter_telephone()


def passer(etat, file, carte, now, tente):
    for p in file:
        if etat['echecs'].get(p['id'], 0) >= ESSAIS_MAX:
            continue
        tente[0] = True
        try:
            appuyer(p['url'])
            ok = False
            for _ in range(4):
                time.sleep(30)
                ok = serveur(set(carte) | set(etat['clos']))['media'].get(code_url(p['url'])) is True
                if ok:
                    break
        except Exception as e:
            ok, p['erreur'] = False, str(e)
        if ok:
            etat['faits'].append({k: p.get(k) for k in ('id', 'url', 'groupe', 'variante', 'vues', 'ret3', 'moy')} | {'le': now.isoformat()})
            sauver(etat)
            noter(f"PASSÉ en normal : {p['groupe']} {p['variante']}, {p['vues']} vues, {p['ret3']:.0f} % à 3 s, {p['moy']:.1f} s, {p['url']}. Programmateur : autres plateformes à programmer ; plus aucune version de cette vidéo en essai.")
            prevenir_programmateur(f"[Automatique, pas un message de Marceau] passage_normal.py vient de passer {p['groupe']} {p['variante']} en Reel normal ({p['url']}). Programme-le maintenant sur les autres plateformes connectées (YouTube version composée d'après la recette du dernier passage, Facebook et TikTok quand ils sont ouverts), au plus tôt, au moins 1 h d'avance, jamais après 20 h NY. Ligne dans PASSAGES-NORMAUX.md et youtube-ok.json quand c'est fait.")
            return print('passé', p['groupe'], p['variante'])
        etat['echecs'][p['id']] = etat['echecs'].get(p['id'], 0) + 1
        etat.setdefault('echecs_le', {})[p['id']] = now.date().isoformat()
        sauver(etat)
        noter(f"ÉCHEC {etat['echecs'][p['id']]}/{ESSAIS_MAX} : {p['groupe']} {p['variante']} {p['url']} {p.get('erreur', 'API : toujours pas partagé')}")
        return print('échec', p['groupe'])
    print('aucun gagnant à passer')


def prevenir_programmateur(texte):
    """7/11 : les autres plateformes attendaient qu'un humain lise PASSAGES-NORMAUX.md. Le message part seul
    au Programmateur le plus récent (session durable « Programmateur V<n> »), tapé dans son écran."""
    reg = Path.home() / '.claude' / 'sessions-durables'
    progs = []
    for d in reg.glob('programmateur-v*'):
        m = re.fullmatch(r'programmateur-v(\d+)', d.name)
        if m and (d / 'nom').exists() and not (d / 'terminee').exists():
            progs.append((int(m[1]), d.name))
    if not progs:
        return noter('ALERTE : aucun Programmateur V<n> ouvert pour programmer les autres plateformes.')
    s = max(progs)[1]
    try:
        subprocess.run(['/usr/bin/screen', '-S', f'cc-{s}', '-p', '0', '-X', 'stuff', texte], timeout=20, check=True)
        time.sleep(1)
        subprocess.run(['/usr/bin/screen', '-S', f'cc-{s}', '-p', '0', '-X', 'stuff', '\r'], timeout=20)
    except Exception as e:
        noter(f'ALERTE : message au Programmateur {s} impossible ({e}).')


def sauver(etat):
    ETAT.write_text(json.dumps(etat, ensure_ascii=False, indent=1))


def gagnant(groupe):
    """Code 3 si une version de ce groupe a gagné. Pour la garde de publier.py : ne lit que ce groupe."""
    carte = recus()
    d = serveur({i for i, g in carte.items() if g[0] != groupe})
    now = dt.datetime.now(dt.timezone.utc)
    for p in d['posts']:
        age = (now - dt.datetime.fromisoformat(p['date'].replace('Z', '+00:00'))).total_seconds() / 3600
        if carte.get(p['id'], (None,))[0] == groupe and age >= AGE_H and (p.get('vues') or 0) >= VUES and (p.get('ret3') or 0) >= RET3 and (p.get('moy') or 0) >= MOY:
            print(f"{p['vues']} vues, {p['url']}")
            sys.exit(3)


def main():
    etat = json.loads(ETAT.read_text())
    if sys.argv[1:] == ['lancer']:
        return lancer(etat)
    if sys.argv[1:] == ['prechauffe']:
        return prechauffe(etat)
    if sys.argv[1:2] == ['gagnant']:
        return gagnant(sys.argv[2])
    d = serveur(etat['clos'])
    for p in plan(etat, d, recus()):
        print(p['groupe'], p['variante'], p['vues'], f"{p['ret3']:.1f} %", f"{p['moy']:.1f} s", p['url'], 'DÉFAUT' if p['groupe'] in etat['defauts'] else '')
    print('partagés (API) :', [k for k, v in d['media'].items() if v])


main()
