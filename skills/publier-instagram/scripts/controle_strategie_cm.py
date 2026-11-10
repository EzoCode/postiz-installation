#!/usr/bin/env python3
"""Cristal Memoria : refuse de programmer une vidéo hors stratégie (Marceau, 7/11/2026, sur SO2 v10 :
« il est trop nul. Et c'est pas du tout ce qu'on avait dit qu'on ferait comme stratégie. C'est insupportable. »).
L'erreur est revenue deux fois (SO2 retiré le 6/11, reprogrammé et sorti le 7/11) : elle devient un contrôle.

Lit la section « Stratégie » du CONTROLE-QUALITE.md posé à côté du master (ou dans PRET-programmateur/).
Accepte seulement si les six lignes (a) à (f) du skill cm-contenu y sont, chacune « oui » avec sa preuve, et aucune « non » :
  (a) au moins deux villageois se parlent et jouent le problème, aucune narration seule
  (b) le problème est celui d'un étudiant en médecine, dit dans la première phrase
  (c) la réponse est un fait vérifié à la source primaire, rien de « I'd bet » ni de « I can't find a study »
  (d) pour FX, la fonctionnalité est filmée sur le vrai écran et nommée une fois, sans liste (« oui, sans objet » hors FX)
  (e) tout se passe dans les décors et avec les sprites du jeu, aucun plan de banque ni image photoréaliste
  (f) le concept est dans la liste conforme (FX, rituel de Piet et Cathra)
Forme attendue d'une ligne : « - (a) oui : <preuve à la seconde> ».
Prouve : la session a écrit et signé les six oui. Ne prouve pas que la vidéo est bonne : l'évaluateur neuf en répond.
Appelé par publier.py (compte cristal-memoria) et par postiz_api.py avant tout POST /posts vers Cristal Memoria
(donc par tous les programmer_*.py et crosspost_cristal.py).

usage : controle_strategie_cm.py (--video MASTER.mp4 | --dossier DOSSIER)    code 0 accepté, 1 refusé
"""
import argparse, re, sys, unicodedata
from pathlib import Path

LETTRES = "abcdef"
CONCEPTS_ARRETES = r"\b(SO\d|AF\d|CC\d|RH\d|BU\d?)\b"


def sans_accents(t):
    return unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()


def trouver_controle(chemin):
    p = Path(chemin).expanduser()
    d = p if p.is_dir() else p.parent
    for c in (d / "CONTROLE-QUALITE.md", d / "PRET-programmateur" / "CONTROLE-QUALITE.md", d.parent / "CONTROLE-QUALITE.md"):
        if c.is_file():
            return c
    return None


def section_strategie(texte):
    lignes = texte.splitlines()
    for i, l in enumerate(lignes):
        m = re.match(r"^(#+)\s*(.*)$", l)
        if m and "strategie" in sans_accents(m[2]):
            niveau, corps = len(m[1]), []
            for l2 in lignes[i + 1:]:
                m2 = re.match(r"^(#+)\s", l2)
                if m2 and len(m2[1]) <= niveau:
                    break
                corps.append(l2)
            return corps
    return None


def verifier(controle):
    """Liste des raisons du refus (vide = accepté)."""
    if controle is None:
        return ["aucun CONTROLE-QUALITE.md à côté du master ni dans PRET-programmateur/"]
    corps = section_strategie(controle.read_text(errors="replace"))
    if corps is None:
        return [f"{controle} n'a pas de section « Stratégie »"]
    raisons, vues = [], {}
    for l in corps:
        m = re.match(r"^\s*[-*]?\s*\(?([a-f])\)\s*[:.-]?\s*(.*)$", l, re.I)
        if m:
            vues.setdefault(m[1].lower(), m[2])
    for x in LETTRES:
        t = sans_accents(vues.get(x, ""))
        if x not in vues:
            raisons.append(f"ligne ({x}) absente")
        elif re.search(r"\bnon\b", t) and not re.match(r"\s*oui\b", t):
            raisons.append(f"({x}) non : {vues[x][:120]}")
        elif not re.match(r"\s*\**\s*oui\b", t):
            raisons.append(f"({x}) sans « oui » en tête : {vues[x][:120]}")
        elif len(t.strip()) < 12:
            raisons.append(f"({x}) oui sans preuve")
    if re.search(CONCEPTS_ARRETES, vues.get("f", ""), re.I):
        raisons.append(f"(f) cite un concept arrêté : {vues['f'][:120]}")
    return raisons


def main():
    a = argparse.ArgumentParser()
    a.add_argument("--video")
    a.add_argument("--dossier")
    o = a.parse_args()
    if not (o.video or o.dossier):
        a.error("--video ou --dossier")
    c = trouver_controle(o.video or o.dossier)
    raisons = verifier(c)
    if raisons:
        print("STRATÉGIE CRISTAL MEMORIA : REFUSÉ (" + (str(c) if c else (o.video or o.dossier)) + ")")
        for r in raisons:
            print(" - " + r)
        print("Règle : skill cm-contenu, « Contrôle à passer avant dépôt » ; a-valider/cm-formats/CONTROLE-STRATEGIE-20261107.md.")
        sys.exit(1)
    print(f"Stratégie Cristal Memoria : 6 oui ({c})")


if __name__ == "__main__":
    main()
