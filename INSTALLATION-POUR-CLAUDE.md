# Installation, consignes pour Claude

La personne qui t'envoie ici ne connaît rien à la technique. Fais tout toi-même, sans lui faire taper de commande. Parle-lui simplement, en français, et ne lui demande que ce qu'elle seule peut faire (ouvrir une application, cliquer « Autoriser », se connecter à un compte).

## 1. Récupérer le dépôt

```bash
git clone https://github.com/EzoCode/postiz-installation ~/postiz && cd ~/postiz
```

Copie-le tout de suite en local : le dépôt public sera supprimé peu après.

## 2. Docker

Il faut Docker. Sur Mac, installe OrbStack (`brew install --cask orbstack`, ou https://orbstack.dev), ouvre-le une fois. Sur un serveur Ubuntu : `curl -fsSL https://get.docker.com | sh`. Prévois environ 6 Go de disque et 3 Go de mémoire libre.

## 3. Lancer l'installateur

Sur son Mac (le plus simple) :

```bash
./installer.sh
```

Postiz est alors sur http://localhost:4007. Il ne tourne que quand le Mac est allumé et Docker ouvert : une publication programmée part seulement si l'ordinateur est allumé à l'heure prévue.

Sur un serveur (publication même ordinateur éteint, recommandé pour un usage régulier) : il faut un nom de domaine en HTTPS qui renvoie vers `127.0.0.1:4007`, par exemple avec Caddy (`postiz.son-domaine.fr { reverse_proxy 127.0.0.1:4007 }`). Puis :

```bash
POSTIZ_URL=https://postiz.son-domaine.fr ./installer.sh --minuteurs
```

`--minuteurs` installe les collectes automatiques des statistiques, de la boîte de réception et des formats vidéo (systemd, Linux seulement).

L'installateur crée `.env` avec des mots de passe neufs et ne le remplace jamais ensuite. Pour changer l'adresse, modifie `POSTIZ_URL` dans `.env` puis relance `docker compose up -d`.

## 4. Premier compte

Ouvre l'adresse affichée. La première personne qui s'inscrit devient la propriétaire, puis les inscriptions se ferment (`DISABLE_REGISTRATION`). Fais-la s'inscrire elle-même et noter son mot de passe dans son gestionnaire de mots de passe.

## 5. Relier ses réseaux

Chaque réseau demande une application développeur au nom de la personne (pas celles de Marceau). Ses identifiants vont dans `.env`, puis `docker compose up -d`. Ensuite, dans Postiz : « Add Channel ».

- **Instagram** (compte professionnel) : application Meta, produit « Instagram API with Instagram Login ». `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`. Adresse de redirection : `<POSTIZ_URL>/integrations/social/instagram-standalone`.
- **Facebook** : même application Meta, `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`. Si certaines Pages n'apparaissent pas, mettre leurs identifiants numériques, séparés par des virgules, dans `POSTIZ_FACEBOOK_PAGE_IDS` (correctif de Marceau).
- **YouTube** : projet Google Cloud, API YouTube Data v3, identifiant OAuth « Application Web ». `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`. Redirection : `<POSTIZ_URL>/integrations/social/youtube`. Passer l'écran de consentement en « Production », sinon la connexion expire au bout de 7 jours.
- **X** : `X_API_KEY`, `X_API_SECRET`.
- **TikTok, LinkedIn, Threads, Pinterest…** : variables dans `compose.yaml` (vides par défaut), à brancher de la même façon. Guide officiel de chaque réseau : https://docs.postiz.com/providers

Meta et Google refusent souvent `http://localhost` comme adresse de redirection : pour Instagram et Facebook, l'installation sur serveur en HTTPS est généralement nécessaire.

## 6. Ce qui vient de Marceau

- **Version figée** : Postiz v2.25.0 à empreinte fixe. Les correctifs remplacent des fichiers compilés de cette version précise : ne pas mettre l'image à jour sans retirer les correctifs de `compose.yaml`.
- `patches/facebook` : découverte de toutes les Pages Facebook.
- `patches/youtube` : renouvellement des connexions YouTube sans déconnexion.
- `patches/statistiques` + `config/capserv-stats` : statistiques, boîte de réception, opérations, suivi, veille YouTube, et la grille « Création » (adresse `/creation`). La page d'accueil reste le calendrier normal de Postiz.
- La grille Création, le suivi et la cadence ont été réglés pour les marques de Marceau (identifiants `marceau`, `cristal`, `claudette`, `marc`). Pour ses marques à elle, adapter ces listes dans `config/capserv-stats/creation.cjs`, `suivi.cjs`, `cadence.cjs`, `assets/grille-ui.js` et `assets/creation.css`, puis `docker compose restart postiz`. Si elle n'en a pas besoin, rien à faire : le reste de Postiz marche sans.

## 7. Vérifier

```bash
docker compose ps          # tous « healthy » ou « running »
docker compose logs --tail 50 postiz
```

Arrêter : `docker compose down`. Relancer : `docker compose up -d`. Les données sont dans `data/` : à sauvegarder.
