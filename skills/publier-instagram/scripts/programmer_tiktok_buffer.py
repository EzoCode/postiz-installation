#!/usr/bin/env python3
"""Programme un TikTok par Buffer (API officielle), sans dépendance.

Depuis le 23/10/2026 aucun TikTok ne passe par Postiz ni par le pont autotok.
Sans --apply : vérifie tout et n'envoie rien. La clé est lue dans
~/.config/buffer/key (mode 600), jamais affichée.

Exemple :
  programmer_tiktok_buffer.py --compte claudette --fichier master.mp4 \
      --texte legende-tiktok.txt --quand "2026-10-24 12:00" --apply
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

ENDPOINT = "https://api.buffer.com"
KEY_FILE = Path("~/.config/buffer/key").expanduser()
JOURNAL = Path("~/production/orchestration/buffer-posts.jsonl").expanduser()
CANAUX = {
    "marceau": "6ada7fc1778b240e2f92dd3c",
    "claudette": "6adb8910778b240e2f9f9880",
    "cristal": "6adb8aa5778b240e2f9faa4d",
}
NY = ZoneInfo("America/New_York")
ECART = dt.timedelta(hours=1)
MUTATION = (
    "mutation($i:CreatePostInput!){createPost(input:$i){"
    "... on PostActionSuccess{post{id status dueAt channelId}} "
    "... on InvalidInputError{message} ... on LimitReachedError{message} "
    "... on UnexpectedError{message} ... on RestProxyError{message}}}"
)


def cle():
    if not KEY_FILE.exists():
        sys.exit("Clé Buffer absente : ~/.config/buffer/key (Marceau la dépose, mode 600).")
    if KEY_FILE.stat().st_mode & 0o077:
        sys.exit("~/.config/buffer/key doit être en mode 600.")
    return KEY_FILE.read_text().strip()


def appel(key, query, variables=None):
    corps = {"query": query}
    if variables:
        corps["variables"] = variables
    requete = urllib.request.Request(
        ENDPOINT, data=json.dumps(corps).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(requete, timeout=60) as reponse:
            return json.load(reponse)
    except urllib.error.HTTPError as erreur:
        sys.exit(f"Buffer HTTP {erreur.code}, rien ne doit être renvoyé sans vérifier dans Buffer.")


def deja_programmes(canal):
    heures = []
    if JOURNAL.exists():
        for ligne in JOURNAL.read_text().splitlines():
            try:
                e = json.loads(ligne)
            except ValueError:
                continue
            if e.get("canal") == canal and e.get("buffer_id") and e.get("due"):
                heures.append(dt.datetime.fromisoformat(e["due"].replace("Z", "+00:00")))
    return heures


def upload_postiz(fichier):
    sys.path.insert(0, str(Path(__file__).parent))
    import postiz_api as api
    media = api.request(api.credentials(None), "POST", "/upload", file=fichier)
    chemin = media.get("path") if isinstance(media, dict) else None
    if not chemin or not chemin.startswith("https://"):
        sys.exit("Réponse d'envoi inattendue, rien programmé.")
    return chemin


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--compte", required=True, choices=sorted(CANAUX))
    source = p.add_mutually_exclusive_group(required=True)
    source.add_argument("--fichier", help="MP4 local, envoyé sur le serveur Postiz pour obtenir une URL publique")
    source.add_argument("--video-url", help="URL HTTPS publique du MP4")
    p.add_argument("--texte", required=True, help="fichier texte de la légende (sans crédits)")
    p.add_argument("--quand", required=True, help="AAAA-MM-JJ HH:MM, heure de New York")
    p.add_argument("--code", help="code de l'épisode (D05, CLD10...) pour que la grille Postiz affiche le TikTok publié")
    p.add_argument("--marque", choices=["marceau", "claudette", "cristal"], help="marque de la grille (défaut : celle du compte)")
    p.add_argument("--apply", action="store_true", help="envoie vraiment (sinon simulation)")
    a = p.parse_args()

    texte = Path(a.texte).expanduser().read_text().strip()
    if not texte:
        sys.exit("Légende vide.")
    local = dt.datetime.strptime(a.quand, "%Y-%m-%d %H:%M").replace(tzinfo=NY)
    due = local.astimezone(dt.timezone.utc)
    if due < dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1):
        sys.exit("Programmer au moins 1 h à l'avance, jamais de publication immédiate.")
    if local.hour >= 20 or local.hour < 7:
        sys.exit("Hors fenêtre : jamais après 20 h NY (ni avant 7 h).")
    canal = CANAUX[a.compte]
    for autre in deja_programmes(canal):
        if abs(autre - due) < ECART:
            sys.exit(f"Moins d'1 h d'écart avec un post Buffer du même compte ({autre:%d/%m %H:%M} UTC).")

    key = cle()
    # Lecture seule : le canal doit être connecté, non verrouillé, file active.
    lu = appel(key, 'query { account { organizations { id } } }')
    orgs = [o["id"] for o in lu["data"]["account"]["organizations"]]
    canaux = appel(key, 'query { channels(input: { organizationId: "%s" }) { id isDisconnected isLocked isQueuePaused } }' % orgs[0])
    etat = {c["id"]: c for c in canaux["data"]["channels"]}.get(canal)
    if not etat or etat["isDisconnected"] or etat["isLocked"] or etat["isQueuePaused"]:
        sys.exit("Canal Buffer absent, déconnecté, verrouillé ou en pause : rien programmé.")

    print(f"{a.compte} canal {canal} : {local:%d/%m/%Y %H:%M} NY = {due:%H:%M} UTC, légende {len(texte)} caractères")
    if not a.apply:
        print("Simulation OK, rien envoyé (ajouter --apply).")
        return
    url = a.video_url or upload_postiz(a.fichier)
    entree = {"compte": a.compte, "canal": canal, "due": due.strftime("%Y-%m-%dT%H:%M:%SZ"), "video": url, "start": True}
    JOURNAL.parent.mkdir(parents=True, exist_ok=True)
    with JOURNAL.open("a") as journal:
        journal.write(json.dumps(entree) + "\n")
    variables = {"i": {"channelId": canal, "text": texte, "mode": "customScheduled",
                       "schedulingType": "automatic", "needsApproval": False,
                       "dueAt": entree["due"], "assets": [{"video": {"url": url}}]}}
    # Un seul essai : sur erreur ou délai, lire Buffer avant de recommencer.
    resultat = appel(key, MUTATION, variables)
    post = (resultat.get("data") or {}).get("createPost") or {}
    identifiant = (post.get("post") or {}).get("id")
    with JOURNAL.open("a") as journal:
        journal.write(json.dumps({"compte": a.compte, "canal": canal, "due": entree["due"],
                                  "buffer_id": identifiant,
                                  "status": (post.get("post") or {}).get("status"),
                                  "message": post.get("message")}) + "\n")
    if not identifiant:
        sys.exit("Buffer n'a pas créé le post : " + json.dumps(resultat)[:400])
    if a.code:
        codes_f = Path("~/production/orchestration/buffer-codes.json").expanduser()
        codes = json.loads(codes_f.read_text()) if codes_f.exists() else {}
        codes[identifiant] = {"code": a.code, "brand": a.marque or a.compte}
        codes_f.write_text(json.dumps(codes, ensure_ascii=False, indent=1))
    print("Programmé : Buffer", identifiant, post["post"]["status"], post["post"]["dueAt"])


if __name__ == "__main__":
    main()
