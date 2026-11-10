---
name: publier-instagram
description: >-
  Publier ou programmer les vidéos de Marceau Mause sur ses plateformes connectées,
  et les Reels de House Mascot Claudette et Cristal Memoria via Postiz sur Capserv, avec description adaptée, couverture
  et suivi des doublons. Utiliser pour « publie cet épisode », « poste sur
  Claudette », « programme les vidéos » ou « publie les vidéos prêtes » pour
  ces trois chaînes. Exécution à la demande, sans contrôle périodique.
metadata:
  author: marceau
  version: '1.6'
---

> Lis d'abord ~/production/orchestration/CRITERES-QUALITE.md. `CONTROLE-QUALITE.md` est obligatoire avant tout dépôt ; le Programmateur refuse tout dépôt sans ce fichier.

# Publier les épisodes Instagram

## Retours de Marceau (une règle par ligne, la plus récente prime)

- 07/10 : aucun hashtag dans les légendes de Marceau Mause, Claudette et Cristal Memoria.
- 10/10 : publier Marceau Mause = toutes ses plateformes connectées (Instagram, Facebook, YouTube), pas seulement Instagram.
- 20/10 : « je veux plus le répéter » : Marceau Mause, Claudette, Cristal Memoria passent toujours par Postiz, toutes les plateformes de la marque, sans qu'il le précise.
- 20/10 : « j'ai changé d'avis on met tout l'anglais sur marceaumause pas marceau core » : YouTube = chaîne `@marceaumause`, anglais compris ; Marceau Core ne reçoit plus rien.
- 22/10 : aucun crédit images, vidéos, musiques ou sons dans une description publique, sur aucune plateforme ; provenance et licences restent en interne ; une légende déjà en ligne se corrige par une vraie édition, jamais par suppression et republication.
- 23/10 : « je fais zéro vue » : plus aucun TikTok par Postiz, tout par Buffer.
- 23/10 : « j'autorise tout arrete de me demander » : remplacer un média, déplacer une date, relancer Postiz se font sans redemander, puis on prévient l'orchestrateur.
- 23/10 : « aucun contenu ne doit sortir aussi tard, favorise vers 12 h » et « je t'ai dit jamais de 23 h pour une vidéo » : heure et marges dans « Heures de programmation » plus bas.
- 26/10 : « Tu as totalement skip yt » : une programmation n'est finie que sur Instagram, Facebook, YouTube Shorts (Postiz) ET TikTok (Buffer).
- 26/10 : « les versions YouTube il faut composer la musique toi même qui match celle mise et l'émotion » : YouTube = toujours une version à musique COMPOSÉE par nous, jamais la musique Artlist, jamais un son tendance.
- 26/10 : « post tout ceux non postés » : Marceau a levé l'exclusion des plans vidéo Artlist sur YouTube ; seule la MUSIQUE Artlist y reste interdite (version composée).
- 26/10 : « si je te fais un retour sur une c'est pas pour une autre » : un retour ne touche que le post visé ; ne déplacer, remplacer ou republier aucun autre post.
- **[REMPLACÉ le 4/11 : une version à la fois, gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** 27/10 : « 3 variantes supplémentaires par Reel, en termes de hook » : chaque Reel Instagram reçoit 3 variantes à hook différent, publiées en Reels d'essai (section « Variantes de hook en Reels d'essai »).
- 27/10 : « non on bombarde les vidéos maintenant » : plusieurs vidéos par jour et par compte, YouTube Marceau Mause compris (la limite d'une par jour est levée), au plus tôt ; 1 h de marge, jamais après 20 h, jamais deux posts à la même minute sur un compte, TikTok par Buffer avec 1 h d'écart. « Chaque vidéo sur YouTube sans retard » prime sur « une par jour ».
- 29/10 : « tu peux tout envoyer en essai » puis « Et programme ou poste tout » : plus d'attente de son oui, tout ce qui est fini et contrôlé se programme (original et variantes), il reçoit ce qui sort pour info.
- 30/10 : « Pourquoi tu programme aussi loin ? Il faut faire chaque jour du contenu ! » : un original par chaîne chaque jour, programmé le jour même ou le lendemain, jamais plus loin.
- **[REMPLACÉ le 4/11 : une version à la fois, gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** 30/10 : « Les réels d'essai c'est le même jour tous sur un seul réel » : les 3 variantes d'un Reel sortent le même jour que l'original (13 h, 13 h 20, 13 h 40, 14 h) ; la règle « 2 h d'écart, 10 Reels par 24 h » est supprimée. Les essais ne prennent jamais la place d'un original.
- 6/11 : **Cristal Memoria, plus de contrôle anti-pub (retiré par Marceau).** « Il faut pas qu'il y ait un contrôle anti-pub, il faut juste qu'on modère les pubs. » `publier.py` ne refuse plus rien sur ce motif. Programmation : pas deux vidéos de suite qui mettent l'app en avant. Texte : `~/production/orchestration/retours/CM-moderer-les-pubs-20261106.md`.
- 30/10 : **contrôle des faits avant programmation.** `python3 -I scripts/controle_faits.py --texte "<légende>" <dossier PRET-programmateur ou .srt>` compare légende et sous-titres aux formules interdites de `~/ReelsUSA-cache/proj/analysis/faits-corriges.md` (« no degree », « Wi-Fi en 4 heures », près de Times Square) et des consignes du dossier (aucun nombre d'installations : « first thousands of installs »). Code 1 et « REFUS » : ne pas programmer, renvoyer à la session de fabrication. Code 0 : on peut continuer. Une correction de plus de Marceau = une ligne de plus dans la liste `INTERDITS` du script.
- 30/10 : « maintenant on poste que des essais first et apres on mettra en post officiel celui qui aura le mieux marché » : Marceau Mause seulement : toute version, original compris, part d'abord en Reel d'essai sur Instagram ; ni Facebook, ni YouTube, ni TikTok avant le choix du gagnant (relevés J+1 à J+3), qui part alors sur toutes les plateformes. Prime sur « programmation finie = toutes les plateformes » jusqu'au gagnant. Claudette et Cristal Memoria n'ont pas les Reels d'essai : rien ne change. Un post déjà publié ne se supprime pas, il se liste dans `a-valider/doublons-a-retirer.md`.
- **[REMPLACÉ le 4/11 : une version à la fois, gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** 30/10 (régie) : un gagnant ne passe en officiel qu'après ses 48 h et un contrôle qualité : D02, gagnant décidé à 48 h et pas C d'office ; PMBA003 C refusé pour l'officiel (critères 1, 6, 8, 15). 31/10 : Marceau refuse les hooks de D02 (frigo, lunettes) : aucun essai D02 en officiel, même gagnant, contrôle de 48 h du 1/11 annulé. Tout Marceau Mause part d'abord en essai, original compris (étape 2 de « Variantes de hook » corrigée).

- **[REMPLACÉ le 4/11 : une version à la fois, gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** 2/11 : « post en vrai réel ceux qui ont marché » : les gagnants d'avant le 2/11 repassent aux critères de cadre du 2/11 (9 quater à 9 sexies, et 9 ter pour Notes) avant l'officiel : 009 A, 010 H2, 008 C, MN003 V3 échouaient tous, corrigés sans toucher voix ni texte, suivi dans `a-valider/officiels-gagnants/`. Un refus explicite de Marceau (D02, TEST-B) tient même si l'essai dépasse la médiane. Une vidéo déjà sur YouTube ne s'y renvoie pas pour un nouveau hook.
- 4/11 : remplace la ligne du 2/11 : plus de republication ni de nouveau master pour un gagnant, voir « Variantes de hook ».

## Pièges déjà payés (piège, puis correction)

- 31/10, réception d'un dépôt : relire `CONTROLE-QUALITE.md` contre `CRITERES-QUALITE.md` (0, 1, 6, 7 bis à 7 quinquies, 9 bis, 12 bis, 13 pour Life), pas seulement sa présence. Critère déclaré non tenu = refus (PMBA003 refonte C, 14 h 55) ; dépôt sans contrôle = refus (TEST-B v3 à 16 h 10, PMBA003 à 12 h 44 et 19 h 31) ; tiers identifiable sans accord = suspendu (MN001 v2, 10 h 20) ; une session peut retirer ses masters du dépôt (TEST-B v3, 18 h 16) : relire le dossier juste avant de programmer.
- Heure d'hiver à New York le 1/11 à 2 h : 12 h NY = 17 h UTC (16 h UTC jusqu'au 31/10), 20 h NY = 01 h UTC. Donner l'heure en UTC explicite et relire chaque post par GET (`relances.md`, ligne L1 corrigée le 1/11 : elle visait le créneau d'E1).
- Couvertures, petits Whisper et vérifications : `creneau rapide`, pas `creneau lourd` (2 h d'attente pour des couvertures de variantes le 29/10) ; `--video <ID>` : un ticket par vidéo, code 76 = remplacé, pas un échec.
- `controle_faits.py` (31/10) : sa liste INTERDITS ne connaît ni « pitching at Yale », ni « said yes », ni « two suitcases », et son message sur les études dit encore « Sciences Po dropout » alors que Marceau veut « college dropout » (31/10). Relire ces formules à la main en attendant la mise à jour du script (une correction de Marceau = une ligne de plus dans INTERDITS).
- 30/10, correction stockage Codex : les uploads via `scripts/postiz_api.py` prennent maintenant un verrou sur le serveur, commun aux sessions, puis vérifient `1 Gio + 2 × taille du fichier` libres. Le verrou reste tenu jusqu'à la réponse de l'upload. Ne pas remplacer ce contrôle par le seul seuil historique de 250 Mo. Un envoi refusé n'a transmis aucun média. Les scripts qui font leur propre HTTP ne sont pas couverts : utiliser le client commun. Un processus déjà démarré avant la correction doit être relancé normalement pour la charger.
- Maintenance des doublons : `postiz-storage.timer` conserve chaque URL et chaque fichier, en partageant seulement les octets identiques des médias inchangés depuis au moins une heure et sans fichier ouvert au moment du contrôle. État : `/var/lib/postiz-storage/last-run.json` sur Capserv. Aucun effacement automatique de vidéo publiée. Un changement du code de stockage Postiz bloque la maintenance jusqu'à sa vérification. Les originaux distincts continuent de consommer de la place, prévoir capacité ou archivage.

- `publier.py`, `file_attente.py` et les scripts Postiz plantent sur le python système (`hashlib.file_digest` absent) : toujours `/opt/homebrew/bin/python3`. Le python du créneau n'a pas numpy : appeler `/opt/homebrew/bin/python3` dans les fabriques.
- Le GET public de Postiz ne renvoie pas le média : vérifier ID + `QUEUE` + date par GET, et le média par l'empreinte sur le serveur ou en base.
- Remplacer le média d'un post programmé en créant un nouveau post (doublon) : `POST /posts` avec le manifeste du reçu et `value[0].id` = l'ID existant ; déplacer une date = même méthode avec la nouvelle date ; Buffer = mutation `editPost` (texte, `dueAt` et assets obligatoires). Détail : [reprise.md](references/reprise.md).
- Quota Buffer : 250 appels par jour et par clé, au-delà HTTP 429 (constaté le 26/10, remise à zéro vers 16 h 18 NY ; la simulation compte aussi). Le LaunchAgent `com.marceau.buffer-suivi` (toutes les 15 min) l'a épuisé et bloquait les TikTok : il est en pause. ~~ne le relancer qu'avec `StartInterval` de 3600 s ou plus~~ Il tournait encore toutes les 15 min sur 16 posts (~1 500 appels par jour pour un quota de 250) et a été désactivé le 1/11 (`launchctl bootout` + `disable`) : ne le remettre qu'avec `StartInterval` de 86400 s ou plus. Sur un 429, ne pas boucler : relire `buffer-posts.jsonl`, attendre la remise à zéro, un seul essai.
- Un `ERROR` Postiz sur YouTube cache souvent une vidéo déjà en ligne : relire la chaîne par yt-dlp avant de dire qu'elle manque ou de renvoyer.
- Deux posts à la même minute sur un même compte : décaler d'une minute au moins.
- Facebook Marceau Mause refuse tout tant que Marceau n'a pas confirmé l'identité de la Page : ne rien renvoyer en boucle, le rappeler dans la boîte du matin.
- Upload coupé en `Broken pipe` : master allégé, voir [reprise.md](references/reprise.md).
- Disque interne plein : le créneau refuse tout rendu (code 75). Lancer d'abord `~/mac-cleanup/nettoyage.sh`, ne jamais effacer les dossiers d'autres sessions, prévenir l'orchestrateur.
- Postiz en panne (27/10 vers 21 h 35) : l'API répondait HTTP 500 puis 401 (même GET /integrations refusé). Le 401 ne venait PAS d'une mauvaise clé : le volume capServ `/mnt/HC_Volume_106256009` (79 Go) était plein et postgres plantait. Diagnostic : regarder le disque du serveur (`df -h` par SSH `cap-server`) et l'état de postgres AVANT de toucher à la clé. Ne rien uploader pendant la panne ; après la remise en route, relire l'API (GET ID, QUEUE, date) avant de reprogrammer, sans doublon.
- 30/10 : l'API publique Postiz est limitée à 30 requêtes par heure (`API_LIMIT=30`, clé partagée entre toutes les sessions) : HTTP 429 `ThrottlerException` en plein lot de déplacements. Un upload compte, un POST aussi : espacer, attendre sur un 429, et relire par un seul GET de période à la fin du lot, pas un GET par post.
- 30/10 : « This account doesn't support Trial Reels » n'est pas réservé à Cristal Memoria : Claudette le renvoie aussi (CLD13 A B C le 29/10, CLD01-A le 30/10). Lire l'état réel dans Postiz après l'heure de sortie avant d'écrire qu'un essai est parti.
- 29/10 : l'API publique n'a pas de `GET /posts/<id>` (404) : relire un post par `GET /posts?startDate&endDate` et filtrer sur l'ID. Chaque variante de hook pèse autant que l'original (~77 Mo pour 78 s) : 3 variantes ont fait passer le volume Postiz de 573 à 125 Mo libres avec les envois des autres sessions ; relire `df -h` AVANT CHAQUE upload, pas seulement avant le premier, et s'arrêter sous 250 Mo libres.
- Version YouTube non inscrite dans `state/youtube-ok.json` : le contrôle la refait ou la signale ; inscrire chaque version composée dès qu'elle est programmée.

Porter une vidéo terminée jusqu’au Reel réellement publié, ou au post réellement programmé dans Postiz. Source canonique : `/Users/marce/agent-skills/publier-instagram/` ; Python 3.11 ou supérieur, bibliothèque standard, SSH existant `cap-server`. Les scripts et le registre ne dépendent d’aucun dossier de conversation.

## Intention et comptes

| Nom demandé | Alias du script | Compte exact |
|---|---|---|
| Marceau, Marceau Mause, MBA | `marceau` | `@marceaumause` |
| Claudette, House Mascot | `house-mascot` | `@housemascot.claudette` |
| Cristal Memoria, CM | `cristal-memoria` | `@cristal.memoria` |

La demande « publie » ou « programme » autorise la préparation et l’envoi correspondant. Aller jusqu’au résultat sans redemander la même confirmation. « Prépare », « montre » ou « fais une description » autorise la préparation seulement, employer `--preview`. Une simple invocation sans objet ni intention claire ne publie rien.

Pour Marceau Mause, une demande de publication couvre toutes les plateformes connectées et actives de cette même marque dans Postiz, sauf restriction explicite de Marceau. Consigne précisée le 10 octobre 2026 : inclure YouTube et Instagram, ainsi que Facebook ou toute autre plateforme réellement accessible pour Marceau. Vérifier les identités à chaque exécution ; un compte TikTok de Cristal Memoria ne constitue pas un compte Marceau. Compléter les plateformes manquantes sans republier celles déjà confirmées. Le script `publier.py` reste le raccourci Instagram : pour les autres plateformes, suivre [diffusion-multiplateformes.md](references/diffusion-multiplateformes.md) et l’API Postiz.

Routage YouTube, décision de Marceau du 20 octobre 2026 (« j'ai changé d'avis on met tout l'anglais sur marceaumause pas marceau core ») : les vidéos de Marceau vont sur la chaîne YouTube **Marceau Mause `@marceaumause`**, l'anglais compris, avec titre et description dans la langue de la vidéo. **Marceau Core `@marceaucore` ne reçoit plus rien** : la règle du 18 octobre qui y envoyait l'anglais est abandonnée. Une seule version par vidéo sur la chaîne ; quand elle existe en anglais et en français, l'anglaise y va, la française garde TikTok. Concerne aussi les Shorts Personal MBA / Business Science et les vidéos life. Voir les identités et les reçus dans [diffusion-multiplateformes.md](references/diffusion-multiplateformes.md).

Ce skill remplace, pour ces Reels, le contrôle horaire désactivé le 7 octobre 2026. Il n’installe ni heartbeat, ni cron, ni surveillance. Déposer un fichier dans Prêts à publier le rend disponible ; lancer la publication à la demande de Marceau, pour les seuls fichiers concernés.

Pour ces trois comptes, privilégier Postiz choisi par Marceau. `publication-auto-short` concerne Marc Ranjon et un autre publieur. `instagram-api` concerne les opérations Graph directes, notamment les autres formats ; ne pas substituer ce chemin à Postiz pour ce workflow.

## Trouver et préparer l’épisode

1. Vérifier les connexions actuelles :

   ```sh
   python3 /Users/marce/agent-skills/publier-instagram/scripts/publier.py --comptes
   ```

   Le script exige une intégration Instagram Standalone active dont le @ correspond exactement. Les IDs sont retrouvés à chaque exécution.

2. Retrouver la livraison finale et le script réel. Lire [comptes-et-medias.md](references/comptes-et-medias.md) pour les chemins et les différences de ton. Relever les versions dans le README du projet, examiner et écouter la vidéo ou exploiter sa transcription fiable. Contrôler avec ffprobe le MP4, la durée, les pistes, et regarder début, plans centraux et fin. Ne pas confondre un rendu de revue et un master final. Si deux épisodes restent plausibles après lecture, demander lequel tout en préparant le reste.

3. Rédiger la légende dans la langue de la vidéo en suivant [legendes-instagram.md](references/legendes-instagram.md). Donner envie de regarder avec une accroche précise, ajouter un complément utile sans dérouler tout le scénario, puis choisir une invitation adaptée à cette chaîne si elle sert le propos. Préserver les révélations de la vidéo dans les légendes, descriptions et titres de toutes les plateformes : avant publication, repérer dans le script la marque, l’identité, la réponse ou la chute gardée pour la suite, puis vérifier que toute la légende, crédits et invitation compris, ne la dévoile pas. Un nom trouvé dans le fichier ou les notes de production peut constituer un spoiler. Voir la règle et le cas Patagonia dans [legendes-instagram.md](references/legendes-instagram.md). Marceau : curiosité business ; Claudette : complicité et situation concrète ; Cristal Memoria : humour des personnages. Vérifier les faits. Ne jamais ajouter de crédits images, vidéos, musiques ou sons aux descriptions publiques, consigne explicite de Marceau du 22 octobre 2026. Conserver provenance et licences dans les dossiers internes, et choisir des médias compatibles avec cette présentation. Pas de promesses inventées ni de formule identique copiée entre les comptes. Une grille commerciale complète est facultative pour une courte légende. Ne pas ajouter de hashtags aux légendes de ces trois comptes, préférence explicite de Marceau du 7 octobre 2026.

4. Préparer une cover fidèle à cette chaîne : sujet identifiable, accroche courte lisible sur mobile, visage ou personnage visible, éléments essentiels dans le centre 3:4. JPEG 9:16, moins de 8 Mo. Utiliser les images réelles de l’épisode et les références de Marceau. Toute génération ou retouche passe exclusivement par `image_gen` intégré à Codex ; depuis Claude, lire `/Users/marce/agent-skills/codex-image/SKILL.md`. Une conversion de format peut produire le JPEG sans changer le visuel. Si image_gen est indisponible, utiliser une couverture déjà approuvée et adaptée quand elle existe, sinon laisser ce point en attente sans appeler Gemini ou un autre générateur.

Conserver les médias originaux. Les préparations volumineuses vont dans `/Volumes/MarceauDepot/Montage/Publication-Instagram/Preparation/`, seulement si le SSD est monté. Les petits livrables de la session peuvent rester dans ses sorties. Les secrets restent sur Capserv, lus par SSH en mémoire, jamais dans le skill ou les reçus.

## Publier ou programmer

Passer les chemins réels de la vidéo, de la légende UTF-8 et du JPEG. Le reçu est choisi automatiquement dans `state/receipts/`, d’après le compte et l’empreinte du MP4.

```sh
python3 /Users/marce/agent-skills/publier-instagram/scripts/publier.py \
  --video VIDEO.mp4 --compte marceau \
  --legende-fichier LEGENDE.txt --cover COVER.jpg --preview
```

Après ce contrôle, retirer `--preview` pour publier immédiatement si cela a été demandé. Ajouter `--date` pour programmer, avec une date future ISO et un fuseau explicite. Par exemple, `2026-10-10T18:00:00-04:00`. Convertir la date demandée dans le fuseau du lieu choisi ; New Haven correspond à `America/New_York`, dont le décalage change avec l’heure d’été. Ne pas inventer une cadence ni décaler un post existant sans demande de Marceau (déplacement : [reprise.md](references/reprise.md)).

Le champ média `thumbnail` transmet la couverture à Instagram via `cover_url`. Un seul MP4 avec `post_type: post` crée le Reel. Le script bloque les comptes indisponibles, dates invalides et vidéos déjà soumises sur le même compte. Aucune commande de publication réelle pour un simple test.

```sh
python3 /Users/marce/agent-skills/publier-instagram/scripts/publier.py --verifier-recus
```

Pour une publication immédiate, attendre et vérifier `PUBLISHED`, l’ID Instagram et le lien du Reel. Pour une programmation, vérifier le post dans Postiz avec l’état `QUEUE` et la date de publication demandée ; le rapport du script affiche alors `SCHEDULED`. Dire « programmé », sans annoncer qu’il est déjà publié. Si l’envoi ou la vérification est incertain, suivre [reprise.md](references/reprise.md) ; pour déplacer la date d’un post programmé (même ID), voir sa dernière section.

## Corriger une légende après publication

Pour corriger un Reel déjà en ligne sans navigateur, lire [corriger-legende.md](references/corriger-legende.md). L’outil local Instagrapi est distinct de la connexion Graph de Postiz et nécessite sa propre session Instagram. Une demande de correction autorise l’édition des Reels ciblés ; ne pas redemander l’accord sur le texte déjà demandé. Seule la relecture réelle d’Instagram confirme la correction publique.

## Traiter un lot à la demande

Les dossiers existants se trouvent dans `/Volumes/MarceauDepot/Montage/Publication-Instagram/Prets-a-publier/` : `marceau`, `claudette`, `cristal-memoria`. Une demande « publie tout ce qui est prêt » permet de traiter ce lot, avec chaque chaîne déterminée par son dossier.

```sh
python3 /Users/marce/agent-skills/publier-instagram/scripts/file_attente.py
```

Traiter les candidats `READY`. `WRITING` reste en attente. `KNOWN` exige de lire l’état existant, aucune republication. Si le reçu est `CHECKED`, reprendre avec ses `sources` déjà préparées, sans recréer une légende ou une couverture différente. Les scripts ou sous-titres placés à côté du MP4, avec le même nom et `.md`, `.txt` ou `.srt`, aident à comprendre l’épisode.

## Rendre le résultat

Une réponse courte en français avec le lien réel de chaque publication confirmée, plateforme par plateforme, ou la date et la chaîne des posts confirmés comme programmés. Nommer les seules plateformes encore bloquées et les limites de couverture réellement constatées. Ne pas contacter de tiers, modifier les publicités, créer de nouveaux comptes ou publier sur une autre marque.

## TikTok : par Buffer, jamais par Postiz (règle de Marceau du 23 octobre 2026)

Le pont autotok est arrêté (zéro vue, shadowban probable). Postiz ne publie plus rien sur TikTok : ne programme aucun post TikTok dans Postiz, même par `publier.py` ou `crosspost_*.py` (utiliser `--sans youtube,tiktok` quand l'option existe). Les TikTok passent par l'API officielle de Buffer (compte <e-mail du compte Buffer>, offre Free, trois canaux : marceau.mausee, claudette.housemascot, cristal.memoria).

```sh
S=~/agent-skills/publier-instagram/scripts/programmer_tiktok_buffer.py
python3 -I $S --compte marceau|claudette|cristal --fichier <master.mp4> --texte <legende.txt> --quand "AAAA-MM-JJ HH:MM"          # simulation
python3 -I $S --compte ... --fichier ... --texte ... --quand "..." --apply                                                   # envoi
```

- Heure de New York ; règles d'heure : « Heures de programmation » plus bas ; au moins 1 h d'écart entre deux posts TikTok du même compte (journal `~/production/orchestration/buffer-posts.jsonl`). Quota : voir « Pièges déjà payés ».
- `--fichier` envoie le MP4 sur le serveur Postiz pour obtenir une URL publique ; `--video-url` accepte une URL HTTPS déjà publique.
- Légende : le texte de la plateforme, sans crédit musique. Un seul essai : après une erreur ou un délai, lire Buffer (le script a écrit le début de l'envoi dans le journal) avant de recommencer.
- La clé est dans `~/.config/buffer/key` (mode 600). Ne jamais l'afficher ni la coller. Si Marceau la change, le fichier est remplacé par lui.
- Résultat attendu : `Programmé : Buffer <id> scheduled`. Note l'id dans ton fichier d'état. Après l'heure, le statut `sent` et l'URL TikTok se lisent dans Buffer ; ne pas déclarer « publié » sans les avoir lus.

## Programmation finie = toutes les plateformes (règle de Marceau, 26 octobre 2026)

Une programmation n'est finie que lorsque **toutes les plateformes de la marque** sont programmées : Instagram, Facebook, YouTube Shorts (Postiz) et TikTok (Buffer). Facebook Marceau Mause reste bloqué (identité de la Page). Ne jamais déclarer une programmation terminée avec un trou.

**YouTube fait partie de toute diffusion, TOUJOURS en version à musique composée par nous (Marceau, 26/10/2026 : « Tu as totalement skip yt » puis « les versions YouTube il faut composer la musique toi même qui match celle mise et l'émotion »).** Jamais la version à musique Artlist ni un son tendance sur YouTube, même en rattrapage ; seule la musique est concernée : les plans vidéo Artlist y sont permis depuis le 26/10 (« post tout ceux non postés »). Prendre la version composée quand elle existe (Life : rendu `--yt` de reels-vie, `*_YT_*.mp4` ; Business : `composer.py` ; CM : `_publication_youtube.mp4` du MÊME montage, vérifier la même durée). Sinon la fabriquer : une musique composée qui reprend le caractère, le tempo et l'émotion de l'originale passage par passage, un rendu à la fois depuis la RAM, puis la programmer. Un épisode sans version composée n'est pas envoyé : il est signalé. Inscrire chaque version composée dans `state/youtube-ok.json` (clé `video_sha256` du média Instagram, raison, `media`, `titre`). Avant de dire qu'un YouTube manque, relire la chaîne par yt-dlp : un ERROR Postiz cache souvent une vidéo en ligne. Le média réellement publié se relit en base Postiz (le GET public ne le renvoie pas), et son empreinte sur le serveur (`docker exec postiz sha256sum /uploads/<chemin>`) retrouve le bon fichier local quand le reçu est périmé. Rattrapage du 26/10 : `~/production/orchestration/diffusion/rattrapage-youtube-20261026.py` et RATTRAPAGE-YOUTUBE-2026-10-26.md.

Contrôle automatique : `scripts/controle_diffusion.py [--apply]`, lancé chaque jour à 13 h par le LaunchAgent `com.marceau.controle-diffusion`. Il liste les trous de la veille et du jour, comble YouTube (et Facebook de Claudette et Cristal Memoria) sans doublon, et écrit `~/production/orchestration/diffusion/AAAA-MM-JJ.md`. Les TikTok absents du journal Buffer y sont signalés, non rattrapés.

Un rattrapage YouTube ne sort jamais avant la première sortie Instagram de l'épisode (orchestre, 26/10/2026) ; au plus 2 rattrapages par jour et par chaîne, entre 9 h et 20 h NY, au moins 1 h d'avance et 1 h d'écart avec les autres posts de la chaîne. `controle_diffusion.py` applique ces règles.

## Heures de programmation (Marceau, 23 et 26/10/2026)

- Au plus tôt dès que l'épisode est fini et contrôlé (plus d'attente du oui de Marceau depuis le 29/10), vers 12 h NY (11 h à 13 h) ; si 12 h n'est plus tenable, le plus tôt possible (jamais une heure par défaut comme 18 h). Jamais après 20 h NY. Au moins 1 h de marge entre l'envoi et la sortie, jamais de publication immédiate.
- Pas deux posts à la même minute sur un même compte.
- Plusieurs vidéos par jour sur la chaîne YouTube Marceau Mause sont permises depuis le 27/10 (« on bombarde » : remplace l'ancienne règle « une seule vidéo par jour »), avec au moins 1 h d'écart avec les autres posts de la chaîne. Le plafond de 2 rattrapages par jour et par chaîne de `controle_diffusion.py` ne concerne que les rattrapages, pas les programmations normales.

## Variantes de hook en Reels d'essai (Marceau, 27/10/2026)

**4/11, passage en normal, prime sur tout ce qui dit « officiel » ou « gagnant » : Marceau : « si c'est un Reels qui a fonctionné, on le met en normal » ; « l'agent n'a pas compris et a voulu les republier ». Un gagnant (au moins 1 000 vues, 60 % à 3 s, 12 s de moyenne, à 48 h) ne se republie JAMAIS : il passe seul en Reel normal par `passage_normal.py` (launchd), même Reel, vues gardées. Une version à la fois : la suivante seulement si la première rate. Stratégie : `~/production/orchestration/STRATEGIE-ESSAIS-20261104.md`.** Limites et exclusions : `state/passages-normaux.json` ; `passage_normal.py plan` dit ce qui passerait. Preuve du passage : `is_shared_to_feed` par l'API, le bouton reste affiché dans l'app. **Bloqué par le code :** `publier.py` refuse tout Reel normal sur Marceau Mause, et toute version d'un groupe tant que la précédente n'a pas ses 48 h, si elle a gagné, ou si le groupe est déjà passé en normal ; `--forcer` seulement sur décision écrite de Marceau. Dépôt à 4 versions : seule la première se programme. Ce qui suit reste vrai pour les essais, sauf là où il dit « officiel » ou « 3 variantes le même jour ».

**3/11/2026, prime sur l'étape 3 ci-dessous (« le MÊME JOUR ») :** le 2/11, 20 essais, et dans 7 lots sur 8 seule la 1re version a été montrée ; Instagram écrit sur les autres « il ressemble à du contenu que vous avez déjà partagé ». Désormais, sur Marceau Mause : une seule version d'une même vidéo par jour (la suivante le lendemain au plus tôt), au plus 7 essais par jour, au moins 50 min d'écart, minutes irrégulières, 10 h à 19 h 30 NY. Ne jamais republier un fichier déjà posté. Une reprise (essai bloqué, Reel déjà publié) se refait en vrai nouveau montage (hook ET plans du corps), pas en nouveau début seul. Détail et calendrier : `~/production/orchestration/ESSAIS-ETALES-20261103.md`.

**Garde automatique (3/11) :** `publier.py --essai` sur Marceau Mause refuse seul un essai hors de ces règles ; `--forcer "<raison>"` seulement sur décision écrite. Avant de monter une variante, mesurer : `scripts/controle_ressemblance.py <mp4>` donne la part d'images déjà postées sur le compte. Il faut moins de 80 % : refus à 85 % ou plus, et à 65 % ou plus contre un Reel déjà publié hors essai. Mesures du 2/11 : bloquées à 91-100 % (reprises de Reels publiés : 66-89 %), montrées à 66-83 %. Un hook seul (2-3 s changées) donne 93-100 % : il ne passe plus, il faut changer les plans du corps (autres images, autre ordre). Seuils à revoir avec les relevés des témoins Business 011 B et 012 B (5/11, 98 %, espacés de 2 jours).

**[REMPLACÉ le 4/11 : une version à la fois, gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** Inspiré de reeep.it (rapport : `/Users/marce/Documents/Codex/2026-09-15/new-chat/reeep-retro-ingenierie.md`). Pour chaque Reel Instagram : ~~l'original part normalement~~ (depuis le 30/10 l'original part en essai aussi, étape 2), plus **3 variantes qui ne changent que le hook** (les 2 à 3 premières secondes : phrase, voix, premier plan, texte à l'écran ; le reste du montage est identique). Les variantes partent en **Reels d'essai** : montrées seulement aux non-abonnés, absentes de la grille, jamais montrées aux abonnés sans action de Marceau.

1. La session de la chaîne écrit les 3 hooks, chacun à ANGLE différent de l'original et des autres (Marceau, 28/10 : « oui le hook différent avec angle différent » : autre douleur, promesse, surprise ou point de vue, jamais une reformulation ; relus par `hook-editor`), génère leurs voix, monte les 3 MP4. Noms : `<episode>-hook-A.mp4`, `-hook-B`, `-hook-C`.
2. **[Partie « officiel » REMPLACÉE le 4/11 : gagnant passé en normal sans republier, STRATEGIE-ESSAIS-20261104.md]** ~~L'original se programme avec `--groupe <episode> --variante original` (sans `--essai`).~~ Depuis le 30/10 (« on poste que des essais first »), Marceau Mause : l'original part LUI AUSSI en Reel d'essai (`--essai manuel --groupe <episode> --variante original`) ; l'officiel (sans `--essai`) n'est programmé que pour le gagnant, sur toutes les plateformes, après 48 h et contrôle qualité. Claudette et Cristal Memoria : pas d'essais, l'original part normalement.
3. **[Partie « même jour » REMPLACÉE le 4/11 : une version à la fois, STRATEGIE-ESSAIS-20261104.md]** Chaque variante : `publier.py ... --essai manuel --groupe <episode> --variante hook-A`, même légende permise, couverture propre à la variante si le premier plan change. Jour et heures (30/10 : « Les réels d'essai c'est le même jour tous sur un seul réel ») : les 3 variantes sortent le MÊME JOUR que l'original, par exemple original 13 h, variantes 13 h 20, 13 h 40, 14 h. Pour un épisode déjà sorti (flop compris) : toutes les variantes d'un même Reel le même jour, un Reel de flop par jour au plus. Plus d'écart de 2 h exigé ni de plafond de 10 Reels par 24 h et par compte (règle maison supprimée, pas une limite Instagram). Restent : jamais deux posts à la même minute sur un compte, au moins 1 h de marge, jamais après 20 h NY. Les variantes partent sans attendre le oui de Marceau (29/10 « tu peux tout envoyer en essai »).
4. Relevés : `variantes.py relever --groupe <episode>` à J+1, J+2 et J+3 (relevés datés dans `state/variantes-releves.jsonl`), puis `variantes.py classement --groupe <episode>`. Le hook gagnant est noté dans l'état de la chaîne et sert au script suivant.
5. Instagram ne fournit les Reels d'essai qu'aux comptes pro ou créateur qui ont la fonction ; si Postiz renvoie une erreur sur `trial_params`, le noter et ne pas republier la variante en Reel normal.

**Boucle des hooks, 30/10 (critère 20).** Marceau : « Pour toutes les vidéos qui n'ont même pas un reel d'essai qui a fonctionné, il faut réessayer avec des nouveaux hooks. » `python3 ~/production/orchestration/a-valider/hooks-relance/releve.py` tient `TABLEAU.md` : marche = au moins la médiane du compte à 48 h. Raté : dire où ça décroche, 3 hooks d'angle neuf copiés d'un vrai hook de `BANQUE-HOOKS.md`, relus par hook-editor, premières secondes remontées, évaluateur neuf, `CONTROLE-QUALITE.md`, dépôt dans `hooks-relance/<EP>/PRET-programmateur/`. Au plus 3 tours par Reel. Claudette et Cristal Memoria n'ont pas d'essais.

`--essai auto` (graduation `SS_PERFORMANCE`) laisse Instagram montrer la variante aux abonnés si elle marche : seulement si Marceau le demande. Postiz relève vues, comptes touchés, enregistrements, J'aime, commentaires et partages ; la durée moyenne de visionnage et le taux d'abandon ne passent pas par Postiz.
