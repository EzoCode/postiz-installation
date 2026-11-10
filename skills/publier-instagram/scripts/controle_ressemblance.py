#!/usr/bin/env python3
"""Avant un Reel d'essai Marceau Mause : part des images du MP4 déjà vues dans une vidéo déjà postée sur le compte.

  controle_ressemblance.py <video.mp4> [--contre autre.mp4 ...] [--json]

Compare (2 images/s, empreinte dHash 64 bits, écart <= 8) le MP4 à toutes les vidéos des reçus Marceau Mause
(state/receipts et receipts-retires) et aux fichiers --contre. Empreintes en cache (state/empreintes/<sha256>.npy).
Code 0 = OK (< 80 %), 1 = REFUS (>= 85 %, ou >= 65 % contre un Reel déjà publié hors essai), 2 = LIMITE (80-85 %).
Mesures du 3/11/2026 : bloquées le 2/11 à 91-100 % (et reprises de Reels publiés à 66-89 %), montrées à 66-83 %.
"""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
ST=Path(__file__).resolve().parent.parent/'state'; CACHE=ST/'empreintes'
def sha(p):
    # 8/11, V10 : relire 200 Mo par référence à chaque appel bloquait publier.py plus d'une heure (SSD lent).
    # Index chemin+taille+date -> sha256, pour ne hacher qu'une fois chaque fichier inchangé.
    st=Path(p).stat(); cle=f'{Path(p).resolve()}|{st.st_size}|{st.st_mtime_ns}'; ix=CACHE/'index-sha.json'
    try: idx=json.loads(ix.read_text())
    except Exception: idx={}
    if cle in idx: return idx[cle]
    v=_sha(p)
    try: idx=json.loads(ix.read_text())
    except Exception: idx={}
    idx[cle]=v; CACHE.mkdir(exist_ok=True); t=ix.with_suffix('.tmp'); t.write_text(json.dumps(idx)); t.replace(ix)
    return v
def _sha(p):
    h=hashlib.sha256()
    with open(p,'rb') as f:
        while b:=f.read(1<<20): h.update(b)
    return h.hexdigest()
def empreinte(p):
    CACHE.mkdir(exist_ok=True); c=CACHE/(sha(p)+'.npy')
    if c.exists(): return np.load(c)
    raw=subprocess.run(['nice','-n','15','ffmpeg','-v','error','-threads','2','-i',str(p),'-vf','fps=2,scale=9:8,format=gray','-f','rawvideo','-'],capture_output=True,check=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,8,9).astype(int)
    h=np.packbits((a[:,:,1:]>a[:,:,:-1]).reshape(len(a),-1),axis=1); np.save(c,h); return h
def part(v,ref):
    d=np.unpackbits(v[:,None,:]^ref[None,:,:],axis=2).sum(2); return float((d.min(1)<=8).mean())
def references():
    out={}
    for p in list((ST/'receipts').glob('marceaumause-*.json'))+list((ST/'receipts-retires').glob('marceaumause-*.json')):
        r=json.loads(p.read_text()); v=(r.get('sources') or {}).get('video')
        if v and Path(v).exists():
            essai=bool((r.get('manifest',{}).get('posts') or [{}])[0].get('settings',{}).get('is_trial_reel'))
            out.setdefault(str(Path(v).resolve()),{'essai':essai,'groupe':(r.get('essai') or {}).get('groupe')})
    # Reels publiés sans reçu local (postés avant ou hors publier.py), téléchargés depuis Instagram le 3/11
    idx=ST/'references-instagram.json'
    for o in (json.loads(idx.read_text()) if idx.exists() else []):
        if Path(o['fichier']).exists():
            out.setdefault(str(Path(o['fichier']).resolve()),{'essai':False,'groupe':'publié '+o['date'][:10]+' '+o['legende'][:30]})
    return out
def main():
    ap=argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--contre',nargs='*',default=[]); ap.add_argument('--json',action='store_true')
    a=ap.parse_args(); cible=str(Path(a.video).resolve()); v=empreinte(cible)
    refs=references()
    for c in a.contre: refs.setdefault(str(Path(c).resolve()),{'essai':False,'groupe':'--contre'})
    res=[]
    for f,info in refs.items():
        if f==cible: continue
        try: res.append(dict(fichier=f,part=round(part(v,empreinte(f)),3),**info))
        except Exception as e: res.append(dict(fichier=f,erreur=str(e)[:80]))
    res=[r for r in res if 'part' in r]; res.sort(key=lambda r:-r['part'])
    pire=res[0] if res else {'part':0}
    pub=max((r['part'] for r in res if not r['essai']),default=0)
    code=1 if pire['part']>=0.85 or pub>=0.65 else 2 if pire['part']>=0.80 else 0
    verdict={0:'OK',1:'REFUS',2:'LIMITE'}[code]
    if a.json: print(json.dumps(dict(verdict=verdict,max=pire['part'],max_publie=pub,proches=res[:3]),ensure_ascii=False))
    else:
        print(f"{verdict} : {pire['part']:.0%} d'images déjà postées (le plus proche : {Path(pire.get('fichier','-')).name}), {pub:.0%} contre un Reel publié hors essai")
        for r in res[:3]: print(f"  {r['part']:.0%}  {'essai' if r['essai'] else 'publié'}  {r['groupe']}  {Path(r['fichier']).name}")
    sys.exit(code)
if __name__=='__main__': main()
