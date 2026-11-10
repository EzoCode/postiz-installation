#!/usr/bin/env bash
# Installe Postiz (configuration de Marceau) dans ce dossier.
# Usage :
#   ./installer.sh                              -> Postiz sur cet ordinateur : http://localhost:4007
#   POSTIZ_URL=https://postiz.mondomaine.fr ./installer.sh   -> sur un serveur, derrière un HTTPS
#   ./installer.sh --minuteurs                  -> (serveur Linux) installe aussi les collectes automatiques des statistiques
set -euo pipefail
cd "$(dirname "$0")"
DIR="$(pwd)"

dire() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
  dire "Docker n'est pas installé."
  echo "Sur Mac : installer OrbStack (https://orbstack.dev) ou Docker Desktop, l'ouvrir une fois, puis relancer ./installer.sh"
  echo "Sur un serveur Ubuntu : curl -fsSL https://get.docker.com | sh"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  if [ "$(uname)" = "Darwin" ] && [ -d /Applications/OrbStack.app ]; then open -a OrbStack; sleep 10; fi
  if [ "$(uname)" = "Darwin" ] && [ -d /Applications/Docker.app ]; then open -a Docker; sleep 25; fi
  docker info >/dev/null 2>&1 || { dire "Docker est installé mais ne tourne pas : ouvre l'application Docker (ou OrbStack), puis relance ./installer.sh"; exit 1; }
fi
docker compose version >/dev/null 2>&1 || { dire "Il manque « docker compose » (Docker trop ancien) : mets Docker à jour."; exit 1; }

# 2. Fichier .env avec des mots de passe neufs (jamais ceux de Marceau)
if [ ! -f .env ]; then
  url="${POSTIZ_URL:-http://localhost:${POSTIZ_PORT:-4007}}"
  url="${url%/}"
  insecure=false; case "$url" in http://*) insecure=true;; esac
  alea() { openssl rand -hex "$1"; }
  umask 077
  cat > .env <<EOF
# Créé par installer.sh le $(date '+%Y-%m-%d %H:%M'). Ne jamais publier ce fichier.
POSTIZ_URL=$url
POSTIZ_NOT_SECURED=$insecure
POSTIZ_PORT=${POSTIZ_PORT:-4007}
POSTIZ_BIND=127.0.0.1
POSTIZ_DB_PASSWORD=$(alea 24)
TEMPORAL_DB_PASSWORD=$(alea 24)
POSTIZ_JWT_SECRET=$(alea 48)

# Réseaux sociaux : à remplir plus tard (voir INSTALLATION-POUR-CLAUDE.md), puis ./installer.sh à nouveau
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
POSTIZ_FACEBOOK_PAGE_IDS=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
X_API_KEY=
X_API_SECRET=
EOF
  dire "Fichier .env créé (mots de passe générés)."
else
  dire "Fichier .env déjà présent : je le garde."
fi
set -a; . ./.env; set +a

# 3. Dossiers de données
mkdir -p data/postiz-uploads data/postgres-volume data/postiz-redis-data data/temporal-elasticsearch-data data/temporal-postgres-data
if [ "$(uname)" = "Linux" ]; then chown -R 1000:1000 data/temporal-elasticsearch-data 2>/dev/null || true; fi

# 4. Démarrage
dire "Téléchargement et démarrage (la première fois : 5 à 15 minutes)…"
docker compose up -d

dire "Attente que Postiz réponde…"
ok=false
for _ in $(seq 1 90); do
  etat="$(docker inspect -f '{{.State.Health.Status}}' postiz 2>/dev/null || true)"
  if [ "$etat" = "healthy" ]; then ok=true; break; fi
  sleep 10
done

# 5. Minuteurs des statistiques (serveur Linux uniquement)
if [ "${1:-}" = "--minuteurs" ]; then
  if [ "$(uname)" = "Linux" ] && command -v systemctl >/dev/null; then
    for f in serveur/*.service serveur/*.timer; do
      sed "s#__POSTIZ_DIR__#$DIR#g" "$f" > "/etc/systemd/system/$(basename "$f")"
    done
    systemctl daemon-reload
    for t in serveur/*.timer; do systemctl enable --now "$(basename "$t")"; done
    dire "Collectes automatiques installées."
  else
    dire "--minuteurs ne marche que sur un serveur Linux : ignoré."
  fi
fi

if $ok; then
  dire "C'est prêt : ouvre $POSTIZ_URL"
  echo "La première personne qui crée un compte devient la propriétaire ; les inscriptions se ferment ensuite."
else
  dire "Postiz n'a pas répondu à temps. Journal :"
  docker compose logs --tail 60 postiz
  exit 1
fi
