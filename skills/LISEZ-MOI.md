# Skills de Marceau pour les descriptions et la publication

`publier-instagram` : rédiger la légende ou la description de chaque plateforme (règles dans `references/legendes-instagram.md`, corrections après publication dans `references/corriger-legende.md`), contrôler les faits et l'absence de publicité, puis programmer dans Postiz.

## Pour Claude

1. Copier le dossier dans les skills : `cp -R skills/publier-instagram ~/.claude/skills/`.
2. Ce skill a été écrit pour les comptes de Marceau (Marceau Mause, House Mascot Claudette, Cristal Memoria) et pour son serveur. L'adapter aux comptes de la personne :
   - remplacer `<POSTIZ_URL>` par l'adresse de son Postiz (celle de `.env`) ;
   - la clé API Postiz se crée dans Postiz (Settings, Public API) et se range dans un fichier privé, jamais dans le skill ; adapter `scripts/postiz_api.py` (ligne qui lit `agent-private.json`) pour lire ce fichier local au lieu de passer par SSH ;
   - remplacer les noms de comptes et de chaînes dans `SKILL.md` et `references/comptes-et-medias.md` ;
   - les parties propres à Marceau (Buffer pour TikTok, émulateur Android, essais de Reels, Marc Ranjon, Cristal Memoria) peuvent être retirées si elle n'en a pas l'usage.
3. Les règles d'écriture des légendes (`legendes-instagram.md`, `corriger-legende.md`) valent telles quelles.
