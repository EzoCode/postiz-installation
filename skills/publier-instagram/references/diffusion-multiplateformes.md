# Diffuser Marceau Mause sur toutes ses plateformes Postiz

La consigne de Marceau du 10 octobre 2026 étend ses publications à toutes ses plateformes connectées. Le périmètre par défaut des deux autres marques reste celui demandé pour elles.

## Destination YouTube : Marceau Mause, anglais compris

Décision de Marceau du 20 octobre 2026 : « j'ai changé d'avis on met tout l'anglais sur marceaumause pas marceau core ». Elle remplace la consigne du 18 octobre (anglais sur Marceau Core, français sur Marceau Mause) pour toutes les prochaines publications de Marceau, y compris Personal MBA / Business Science et vidéos life :

| Langue réelle de la vidéo | Chaîne YouTube | Intégration Postiz (vérifiée active le 18 octobre 2026) |
|---|---|---|
| Anglais | Marceau Mause, `@marceaumause` | `cmuyhkc4p0009mv8unmh4i4ji` |
| Français | Marceau Mause, `@marceaumause` | `cmuyhkc4p0009mv8unmh4i4ji` |
| (abandonnée) | Marceau Core, `@marceaucore` | `cmve1ia9400hnp6818baj4ppd` : ne plus rien y envoyer |

Une seule version par vidéo sur la chaîne : quand une vidéo existe en anglais et en français, l'anglaise va sur YouTube, la française garde TikTok. Relire `/integrations` avant chaque publication et vérifier le profil exact et `disabled: false`. Vérifier la langue dans le contenu ou sa transcription, pas seulement dans le nom du fichier. Les titres et descriptions suivent la langue de la vidéo. Ce changement ne déclenche aucune republication ni suppression des vidéos déjà envoyées sur Marceau Core ; leur sort se décide avec Marceau.

Les reçus YouTube doivent distinguer les intégrations : pour les nouveaux envois, utiliser `youtube-<integration_id>.json` dans le dossier de crosspost et enregistrer l’intégration cible. Lire aussi les anciens `youtube.json` et leurs posts distants pour éviter les doublons sans confondre Core et Mause. Les autres plateformes gardent leurs règles existantes. Le workflow reste exécuté à la demande, sans routage automatique natif de Postiz.

## Vérifier la marque et éviter les doublons

Lire `/integrations` avec le helper canonique `scripts/postiz_api.py`. Garder les connexions actives appartenant à Marceau Mause, vérifier le profil et l’identité distante. Au 10 octobre 2026, Instagram `@marceaumause`, YouTube `@marceaumause` (chaîne `UCkTxRE--FrJIo3C8Mq4o0EA`) et Facebook Marceau Mause (Page `1426245347230519`) ont été vérifiés. Les listes anciennes ne prouvent pas une connexion actuelle. TikTok `@cristal.memoria` appartient à une autre marque.

Lire les posts existants et les reçus avant chaque soumission. Réutiliser les médias Postiz du reçu déjà confirmé : `video_media` et `cover_media`. La légende à reprendre est la dernière correction Instagram vérifiée lorsqu’elle existe, ou le texte corrigé fourni par Marceau ; `sources.caption` et le manifeste d’origine conservent la première soumission et peuvent contenir un ancien spoiler.

Conserver un reçu indépendant par plateforme sous `state/crossposts/<compte>-<sha256-source>/<plateforme>.json`, séparément du registre Instagram utilisé par `publier.py`. Enregistrer `SUBMITTING` avant la requête, puis le résultat `postId`. Une réponse incertaine exige une relecture distante, sans resoumission aveugle. Un succès Instagram ne prouve pas une diffusion YouTube ou Facebook.

## Paramètres vérifiés

Soumettre via `POST /posts`, avec `type: now` pour une publication immédiate autorisée, ou `schedule` et une date explicite pour une programmation. Chaque entrée contient l’intégration réellement vérifiée, `value[0].content`, le média existant dans `value[0].image`, et ses paramètres de plateforme. Ne pas envoyer les identifiants de posts déjà publiés dans une création.

- YouTube : `settings.__type: youtube`, `title` de 2 à 100 caractères sans spoiler, `type: public`, `selfDeclaredMadeForKids: no` pour ces épisodes business, `tags: []`. La cover est `settings.thumbnail: {id, path}` provenant de `cover_media`, distincte de `image[].thumbnail`. Le format vertical et la durée de l’épisode déterminent son classement en Short.
- Facebook : `settings.__type: facebook`, `post_type: post`, titre sans spoiler. Un MP4 publie la vidéo sur la Page vérifiée. Dans le connecteur déployé vérifié le 10 octobre, `image[].thumbnail` n’est pas appliqué à la vidéo Facebook ; ne pas annoncer la cover personnalisée comme confirmée sans preuve réelle.
- Toute autre plateforme Marceau active : lire les paramètres de son connecteur déployé et la documentation officielle, puis publier selon l’autorisation donnée. Ne pas connecter une nouvelle identité ni créer un compte automatiquement.

- TikTok `@marceau.mausee` (intégration `cmv48ibqu0001pirahq44crjg`, utilisée les 11 et 13 octobre) : décision de Marceau du 17 octobre 2026, ses **vidéos life** (série Year One in America) vont sur TikTok **en français uniquement**, jamais la version anglaise. Prendre `BROUILLONS/<EP>_TikTok-FR.mp4` (skill `reels-vie`, étape 10) avec une légende en français. Poster par Postiz ; pour ce que Postiz ne sait pas faire sur TikTok (retirer ou passer en privé une ancienne version anglaise, vérifier l'affichage réel), utiliser computer use dans l'app ou le site TikTok, après accord de Marceau pour chaque retrait. Les Shorts Personal MBA ne sont pas concernés par cette règle. TikTok passe par le pont `autotok` de Capserv (navigateur sur le serveur) : il laisse souvent le post en `ACCEPTED`, et Postiz reste alors en `QUEUE`. Vérifier la vidéo sur le profil public (navigateur intégré, sans connexion : bouton Refresh si la grille affiche « Something went wrong »), puis passer la ligne du post dans `autotok-bridge/data/receipts.sqlite` à `COMPLETED` avec `post_id`, `release_url` et `verification`, après une sauvegarde `receipt-<EP>-before-reconciliation.json` ; Postiz passe `PUBLISHED` au contrôle suivant (fait pour le Day 0 anglais le 13/10 et le Day 0 français le 17/10). Jamais de nouvel envoi pour « débloquer ».

Un jeton YouTube expiré peut être renouvelé par le mécanisme natif du connecteur Postiz. Vérifier la même chaîne après renouvellement, préserver ses permissions et sa sélection. Une nouvelle authentification réellement requise doit être signalée ; continuer les plateformes disponibles.

## Confirmer la diffusion

Vérifier chaque post dans Postiz : `PUBLISHED`, identifiant distant et URL. Pour YouTube, relire l’API officielle avec la connexion existante et vérifier `channelId`, `privacyStatus: public`, `uploadStatus: processed`, le titre et la description sans spoiler. Pour Facebook, vérifier l’identité de la Page, le traitement et la visibilité publique, notamment `privacy.value: EVERYONE`. Une publication mise en file ou un upload reçu ne suffit pas à annoncer un succès.

Si une étape de miniature échoue après l’upload YouTube, retrouver la vidéo déjà envoyée et reprendre cette étape sur le même identifiant. Ne pas créer une nouvelle vidéo pour réessayer sa miniature.

Sources : [création de posts Postiz](https://docs.postiz.com/public-api/posts/create), [paramètres YouTube](https://docs.postiz.com/public-api/providers/youtube), [paramètres Facebook](https://docs.postiz.com/public-api/providers/facebook).

## Claudette : YouTube, TikTok et Facebook après Instagram

`scripts/crosspost_claudette.py <reçu Instagram> "<titre>" [--preview]` programme les trois autres plateformes de House
Mascot Claudette à la date du reçu, avec les médias déjà téléversés, un reçu par plateforme dans `state/crossposts/`.
Constaté le 20/10/2026 : YouTube avec `settings.thumbnail` finit en `ERROR` dans Postiz (CLD04 en ligne quand même, CLD05
absent de la chaîne) ; sans miniature (CLD03), `PUBLISHED`. Le script n'envoie donc pas de miniature YouTube. TikTok
reste souvent en `ERROR` dans Postiz alors que la vidéo est bien en ligne (pont autotok) : vérifier sur le profil public.

## TikTok : plus par Postiz (23/10/2026)

Marceau, 23-24/10/2026 : plus aucun TikTok par Postiz et le pont `autotok` (il pense être pénalisé par TikTok, zéro vue). Les TikTok de Marceau, Claudette et Cristal Memoria passent par **Buffer**. `crosspost_claudette.py` exclut désormais TikTok d'office. Ne rien programmer sur les intégrations TikTok de Postiz.
