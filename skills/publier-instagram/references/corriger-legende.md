# Édition des légendes avec Instagrapi

Solution préparée le 7 octobre 2026 à la demande de Marceau, qui voulait des outils ou du code pour corriger les Reels déjà publiés sans Computer Use. Elle complète Postiz et utilise l’interface privée non officielle d’Instagram. Les jetons Graph de Postiz ne conviennent pas à cette connexion. Validation réelle effectuée le 7 octobre 2026 sur les trois Reels épisode 01 : légendes sans hashtags relues par Instagrapi, puis confirmées indépendamment par l’API Graph via les connexions Postiz. Les reçus portent `instagram_caption_edits`, séparément des anciennes corrections internes Postiz. Vérifier à nouveau chaque future opération, cette validation ne garantit pas les sessions futures.

## Outil installé sur le Mac

Python : `/Volumes/MarceauDepot/Cache/instagram-caption-editor/.venv/bin/python`

Script : `/Volumes/MarceauCode/Tools/instagram-caption-editor/instagram_caption_editor.py`

Dépendance installée : `instagrapi==3.0.13`. Vérifier le montage réel du SSD avant utilisation.

`status` indique seulement si une session existe. `login --account marceaumause` ouvre la saisie locale masquée. Les autres comptes permis sont `housemascot.claudette` et `cristal.memoria`. Les sessions privées vont dans `~/Library/Application Support/Marceau/InstagramCaptionEditor/sessions/`, jamais dans le chat, le vault ou le dépôt. Le mot de passe n’est pas enregistré.

## Lot de corrections

Préparer un JSON : `{"targets": [{"account": "marceaumause", "url": "URL_DU_REEL", "caption": "TEXTE_SANS_HASHTAGS", "expected_caption_sha256": "SHA256_DE_LA_LEGENDE_ACTUELLE_STRIP"}]}`.

Le SHA256 facultatif est calculé sur la légende actuelle sans espaces de début et fin, encodée en UTF-8. Il évite d’écraser une correction manuelle intervenue entre la préparation et l’édition. Utiliser un lien Reel, jamais l’ID Graph en guise d’ID privé Instagram : l’outil calcule le PK depuis le shortcode.

Exécuter `batch --manifest LOT.json --audit-dir RECUS/` pour vérifier et préparer. Ajouter `--apply` pour la correction déjà demandée. Ajouter `--connect` uniquement dans un terminal interactif afin de saisir une connexion manquante ou un code de double authentification.

L’outil vérifie le compte connecté et le propriétaire du Reel, conserve les personnes identifiées et la localisation, refuse les hashtags, puis relit Instagram après l’édition. Un texte déjà conforme ne déclenche aucune nouvelle écriture. `INSTAGRAM_VERIFIED` et `VERIFIED_ALREADY_MATCHES` sont les seuls états confirmés. `SUBMITTING` ou `SUBMITTED_NOT_VERIFIED` exigent une relecture avant toute annonce de réussite.

Une validation, un captcha ou une limitation Instagram exige de traiter le blocage réel. Ne pas multiplier les connexions, changer d’identité réseau ou prétendre que l’édition a réussi. Demander seulement la connexion ou validation manquante, dans l’application ou la fenêtre locale, sans demander de secret dans le chat.

Après une correction réelle, conserver le même post Postiz et journaliser le reçu d’édition publique séparément de `postiz_caption_edits`. Ne pas republier ni supprimer le Reel pour en changer la légende.

Sources : [documentation media_edit](https://subzeroid.github.io/instagrapi/3.0.13/usage-guide/media/), [code du projet](https://github.com/subzeroid/instagrapi).

## Paramètres de connexion vérifiés

Le runtime est sur MarceauDepot pour éviter les imports lents. Dans Instagrapi, `request_timeout` est une pause entre requêtes, utiliser `1`, pas `30`. La double authentification prépare la méthode avant de demander le code, puis soumet celui-ci une seule fois à la vérification en attente. Ne pas relancer le login complet avec un code déjà fourni. Dix tests locaux valident les garde-fous.
