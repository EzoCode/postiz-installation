#!/bin/zsh
# flag_essai.sh <url> : lit ce qu'Instagram affiche dans « Statistiques d'essai » d'un Reel (lecture seule)
u=$1
droid sh "am start -a android.intent.action.VIEW -d '$u' -p com.instagram.android" >/dev/null 2>&1
droid attends "Statistiques d’essai" --ms 20000 >/dev/null 2>&1 || { echo "INTROUVABLE $u"; exit 2; }
droid tape "Statistiques d’essai" >/dev/null 2>&1
droid pause 5 >/dev/null
t=$(droid arbre 2>&1)
if print -r -- "$t" | grep -q "ressemble à du contenu"; then echo "BRIDÉ $u"
elif print -r -- "$t" | grep -q -i "couverture"; then echo "AVERTI $u :: $(print -r -- "$t" | grep -i couverture | head -1 | cut -c1-200)"
else echo "SANS AVERTISSEMENT $u :: $(print -r -- "$t" | sed -n 2,4p | tr '\n' ' ' | cut -c1-200)"; fi
droid touche retour >/dev/null 2>&1; droid pause 1 >/dev/null; droid touche retour >/dev/null 2>&1
