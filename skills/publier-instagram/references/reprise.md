# Reprendre un envoi

Les reçus de `state/receipts/` servent de journal durable. Leur nom est dérivé du compte exact et du SHA-256 du MP4. Les trois publications du 7 octobre 2026 y sont présentes. Ne pas effacer un reçu pour contourner un doublon.

| État | Action |
|---|---|
| CHECKED | Aucun post soumis. Réutiliser la vidéo, la couverture et la légende dans `sources`, puis reprendre l’envoi. Les médias déjà envoyés sont réutilisés. |
| SUBMITTING | Réponse de création inconnue ou en cours. Vérifier les posts Postiz, ne pas resoumettre. |
| SUBMITTED | Post créé, diffusion à confirmer. Lancer `--verifier-recus`. |
| SCHEDULED | Post confirmé dans la file Postiz et date contrôlée. Ne pas recréer. |
| PUBLISHED | Reel confirmé avec ID Instagram et URL. Donner ce lien. |
| ERROR | Diagnostiquer le post existant et l’erreur du fournisseur avant d’envisager une reprise. Ne pas créer une nouvelle publication à l’aveugle. |

Si une soumission a expiré sans réponse, la vérification essaie de retrouver un post unique par compte, texte et date ; si elle ne peut pas l’identifier sans ambiguïté, inspecter le calendrier et les médias du post existant. L’absence de correspondance ne prouve pas que la première tentative a échoué.

Dashboard : <POSTIZ_URL>/launches. API : <POSTIZ_URL>/api/public/v1. L’Authorization utilise la clé brute, sans Bearer ; les helpers lisent `/mnt/HC_Volume_106256009/postiz/agent-private.json` par SSH et la gardent en mémoire. Ne jamais imprimer ce fichier privé.

Instagram exige un compte professionnel et les permissions de publication. Si un compte est désactivé ou absent, préparer les éléments possibles puis reprendre sa connexion dans Postiz. Ne pas publier sur une autre chaîne comme solution de secours. Lire les documentations officielles si la version déployée change : https://docs.postiz.com/public-api/posts/create.

## Corriger une légende déjà publiée

Identifier le post existant par compte, ID Postiz et URL Instagram. Ne jamais resoumettre le MP4 pour changer une légende.

Le 7 octobre 2026, le code de la version déployée confirme que `POST /posts` avec `type: update` et le même `value[0].id` modifie le contenu enregistré dans Postiz, conserve l’état publié et ne lance pas le workflow du fournisseur. Cela ne met pas à jour la légende publique d’un Reel Instagram. Le mode `now` ou `schedule` pourrait republier, ne pas l’utiliser pour cette correction.

Si Marceau demande exclusivement Postiz/API, corriger le texte dans Postiz quand demandé, conserver les médias, la date et les identifiants, puis annoncer explicitement « corrigé dans Postiz, inchangé sur Instagram ». Une correction publique exige une fonction d’édition Instagram réelle ; ne pas annoncer le succès à partir du dashboard seul. Respecter toute interdiction d’utiliser l’interface native. À chaque évolution de version, vérifier ce comportement avant une nouvelle tentative.

Journaliser séparément `postiz_caption_edits` et les éventuelles corrections publiques vérifiées. Préserver le manifeste et l’empreinte de légende d’origine, qui documentent l’envoi initial.

## Upload coupé en « Broken pipe »

Le 20/10/2026 (POL, 184 Mo), l'upload s'est coupé en `[Errno 32] Broken pipe` et le reçu est resté `CHECKED`. Cause
lue dans les journaux du conteneur : `pwrite() "/var/lib/nginx/body/…" failed (28: No space left on device)`. Le
conteneur `postiz` vit sur le volume `/mnt/HC_Volume_106256009`, alors plein à 99 % (une autre session y avait déposé
6,8 Go). Vérifier `ssh cap-server df -h /mnt/HC_Volume_106256009`, ne rien supprimer sur le serveur sans l'accord de
Marceau, et publier un master allégé (x264 CRF 20, `-maxrate 4000k`, AAC 192k, `+faststart`, environ 85 Mo pour
2 min 45) : Instagram et TikTok recompressent de toute façon en dessous. Le reçu `CHECKED` de l'ancien fichier reste
tel quel, sans post.

Le 21/10/2026 (E05 Cristal Memoria, 190 Mo), même coupure alors que le volume avait 11 Go libres : le master allégé a
suffi. Quand le Mac est saturé (charge 700, x264 n'avançait plus), l'encodeur matériel fait le master allégé en
quelques secondes : `ffmpeg -i film.mp4 -c:v h264_videotoolbox -b:v 4000k -maxrate 5000k -bufsize 10000k -pix_fmt
yuv420p -c:a aac -b:a 192k -movflags +faststart film_publication.mp4` (54 Mo pour 2 min).

Le 21/10/2026 (CLD06 de Claudette, 122 Mo), le même `Broken pipe` venait cette fois du réseau du Mac (« Network is
unreachable » par moments), pas du disque du serveur (11 Go libres). Reprise qui marche : `rsync --partial
--append-verify` en boucle vers `cap-server:/mnt/HC_Volume_106256009/tmp-upload-<ep>/`, empreintes comparées, `curl -F
file=@…` sur `<base_url>/upload` depuis capServ (clé lue sur place, jamais affichée), puis `video_media` et `cover_media`
écrits dans le reçu `CHECKED` avec une `note_upload` : `publier.py` les réutilise sans renvoyer le fichier. Supprimer le
dossier temporaire du serveur une fois les posts en file.

## Déplacer la date d'un post programmé (23/10/2026)

L'API publique de Postiz n'a pas de route « changer la date ». Renvoyer `POST /posts` avec le manifeste du reçu, la nouvelle `date`, `type: schedule` et `posts[0].value[0].id` = l'ID du post existant : Postiz fait un upsert sur cet ID (même ID, même légende, même média), termine l'ancien workflow Temporal programmé et en relance un (`posts.service.createPost` puis `startWorkflow`, lu dans le conteneur `postiz` de capServ). Refusé si le post est déjà `PUBLISHED` (garde anti-republication). Sauvegarder le reçu, puis y écrire la nouvelle date ; GET avant et après pour vérifier : un seul post par plateforme, la nouvelle date, `QUEUE`. Fait pour CLD08 (24/10 22 h vers 23/10 23 h 15 NY).

Buffer (TikTok), même ID : mutation `editPost(input: EditPostInput!)` avec `id`, `dueAt` ET obligatoirement `text` + `assets: [{video: {url}}]` (sans eux : « Post must have either text or media »), `mode: customScheduled`, `schedulingType: automatic`. L'URL vidéo est dans la ligne `video` de `buffer-posts.jsonl` qui précède la création ; vérifier son SHA contre le master avant d'envoyer. Relire ensuite `post(input:{id})` : `scheduled` + nouveau `dueAt`. Fait pour MN002 (27/10 13 h vers 28/10 12 h NY).
