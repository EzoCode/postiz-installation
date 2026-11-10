#!/usr/bin/env python3
"""Contrôle des faits avant programmation (30/10/2026, après « No degree » et « three thousand people installed it »).

Compare la légende et les sous-titres aux formules interdites tirées de
~/ReelsUSA-cache/proj/analysis/faits-corriges.md et des consignes du dossier de Marceau.
Refus = code 1 et liste des phrases fautives : ne PAS programmer, renvoyer à la session de fabrication.

usage : controle_faits.py [--texte "légende"] [fichier.srt|.txt|.vtt|.md ...] [dossier]
Un dossier est parcouru pour *.srt, *.vtt, légende*.txt, caption*.txt, LIRE.txt.
"""
import argparse, re, sys
from pathlib import Path

NOMBRE = r"(?:\d[\d.,\s]*|(?:one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|fifty|hundred|thousand|\w+ (?:hundred|thousand))\b[\w\s-]{0,30}?)"
# (motif, raison, source)
INTERDITS = [
    (r"\bno degree\b|\bwithout a degree\b|\bsans dipl[oô]me\b|\bno diploma\b",
     "Marceau a un bachelor de sciences politiques : dire « college dropout » (forme retenue le 31/10 ; « Sciences Po dropout » reste vrai et n'est pas refusé)", "faits-corriges.md, études (30/10, 31/10)"),
    (r"\bwi-?fi\b[^.\n]{0,60}\b(?:in|en|after)\s+(?:4|four)\s+(?:hours?|heures?|h)\b|\b(?:4|four)\s+hours?\b[^.\n]{0,60}\bwi-?fi\b",
     "l'installation d'internet a pris plusieurs semaines, pas 4 heures", "faits-corriges.md, internet (19/10)"),
    (r"\b(?:next to|near|close to|right by|steps from|à côté de|près de)\s+times square\b|\btimes square\b[^.\n]{0,40}\b(?:next door|nearby|à côté|près)\b",
     "ne jamais dire qu'ils habitent près de Times Square", "faits-corriges.md, Times Square (19/10)"),
    (r"(?<![\w])" + NOMBRE + r"\s*(?:\+\s*)?(?:people\s+|users\s+|players\s+|persons\s+)?(?:installed|have installed|installs|downloads|downloaded)\b",
     "jamais de nombre d'installations : « we already have our first thousands of installs »", "consigne Marceau du 30/10 (Installs)"),
    (r"\b(?:installed|installs|downloads) (?:by|from) " + NOMBRE + r"\s*(?:people|users|players)\b",
     "jamais de nombre d'installations", "consigne Marceau du 30/10 (Installs)"),
    (r"\bpitch(?:ing|ed|es)?\s+(?:at|to|for|in front of)\s+yale\b",
     "formule écartée (« ça veut rien dire ») : parler du programme de start-up de Yale ou de « one of the greatest universities in the world »", "CRITERES-QUALITE.md 7 ter (31/10)"),
    (r"\b(?:the\s+)?(?:whole\s+|entire\s+)?room\s+(?:went|got|fell|burst|reacted|gasped|laughed|clapped|erupted|was)\b|\bwe\s+said\s+it\s+once\b|\bsaid\s+it\s+once\b",
     "anecdote de la salle qui réagit écartée (« on l'a dit une fois »)", "CRITERES-QUALITE.md 7 ter (31/10)"),
    (r"\bsaid\s+yes\b|\bdit\s+oui\b",
     "« said yes » écarté (« j'aime pas trop l'expression ») : « my company », ou une formule nouvelle", "CRITERES-QUALITE.md 6 (31/10)"),
]
# Interdits seulement en ouverture (première ligne de texte, hors timecodes)
INTERDITS_OUVERTURE = [
    (r"\b(?:two|2)\s+(?:suit\s?cases|bags|valises)\b|\bdeux\s+valises\b",
     "« j'ai quitté la France avec deux valises » interdit en ouverture : la 1re phrase promet une valeur (critère 1)", "CRITERES-QUALITE.md 1 (31/10)"),
]


def verifier(texte, nom="texte"):
    fautes = []
    ouverture_vue = False
    for num, ligne in enumerate(texte.splitlines(), 1):
        # on ignore les timecodes SRT/VTT et les numéros de bloc
        if re.fullmatch(r"\s*\d+\s*", ligne) or "-->" in ligne:
            continue
        if ligne.strip() and not ouverture_vue:
            ouverture_vue = True
            for motif, raison, source in INTERDITS_OUVERTURE:
                if re.search(motif, ligne, re.I):
                    fautes.append((nom, num, ligne.strip(), raison, source))
        for motif, raison, source in INTERDITS:
            m = re.search(motif, ligne, re.I)
            if m and not re.search(r"first thousands of installs", ligne, re.I) or (m and "installs" in m.group(0).lower() and not re.search(r"first thousands", ligne, re.I)):
                fautes.append((nom, num, ligne.strip(), raison, source))
    return fautes


def fichiers(chemin):
    p = Path(chemin).expanduser()
    if p.is_dir():
        sortie = []
        for motif in ("*.srt", "*.vtt", "légende*.txt", "legende*.txt", "caption*.txt", "LIRE.txt"):
            sortie += sorted(p.rglob(motif))
        return sortie
    return [p]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--texte", action="append", default=[], help="légende donnée en ligne de commande")
    ap.add_argument("chemins", nargs="*")
    a = ap.parse_args()
    fautes, lus = [], 0
    for t in a.texte:
        lus += 1
        fautes += verifier(t, "--texte")
    for c in a.chemins:
        for f in fichiers(c):
            try:
                texte = f.read_text(errors="replace")
            except OSError as e:
                print(f"illisible : {f} ({e})", file=sys.stderr)
                return 2
            lus += 1
            fautes += verifier(texte, str(f))
    if not lus:
        print("rien à contrôler (donne --texte ou un fichier/dossier)", file=sys.stderr)
        return 2
    if fautes:
        print("REFUS : ne pas programmer, formule contraire aux faits corrigés de Marceau.")
        for nom, num, ligne, raison, source in fautes:
            print(f"  {nom}:{num}: « {ligne} »\n    -> {raison} ({source})")
        return 1
    print(f"OK : {lus} texte(s) contrôlé(s), aucune formule interdite.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
