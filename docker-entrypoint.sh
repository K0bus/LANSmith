#!/bin/sh
set -e

# Extraire le répertoire de la base SQLite si DATABASE_URL utilise le protocole file:
if echo "$DATABASE_URL" | grep -q "^file:"; then
  DB_PATH=$(echo "$DATABASE_URL" | sed 's/^file://')
  DB_DIR=$(dirname "$DB_PATH")
  if [ -n "$DB_DIR" ] && [ "$DB_DIR" != "." ]; then
    mkdir -p "$DB_DIR"
  fi
fi

# Mapper automatiquement les variables Twitch pour Nuxt/Nitro
if [ -n "$TWITCH_CLIENT_ID" ] && [ -z "$NUXT_TWITCH_CLIENT_ID" ]; then
  export NUXT_TWITCH_CLIENT_ID="$TWITCH_CLIENT_ID"
fi
if [ -n "$TWITCH_CLIENT_SECRET" ] && [ -z "$NUXT_TWITCH_CLIENT_SECRET" ]; then
  export NUXT_TWITCH_CLIENT_SECRET="$TWITCH_CLIENT_SECRET"
fi

echo "📦 Initialisation / Synchronisation du schéma Prisma SQLite..."
npx prisma db push --skip-generate

# Vérification du statut de l'API Twitch / IGDB
if [ -n "$TWITCH_CLIENT_ID" ] && [ -n "$TWITCH_CLIENT_SECRET" ] && [ "$TWITCH_CLIENT_ID" != "your_twitch_client_id_here" ]; then
  echo "🎮 API IGDB / Twitch : ACTIVÉE (Client ID: ${TWITCH_CLIENT_ID:0:6}...)"
else
  echo "⚠️  API IGDB / Twitch : NON CONFIGURÉE (Mode catalogue local hors-ligne activé)"
fi

# Seed de démonstration si AUTO_SEED=true
if [ "$AUTO_SEED" = "true" ]; then
  echo "🌱 AUTO_SEED activé : insertion des données de démonstration..."
  node prisma/seed.js || true
fi

# Seed des benchmarks GPU/CPU si SEED_HARDWARE=true
if [ "$SEED_HARDWARE" = "true" ]; then
  echo "⚡ SEED_HARDWARE activé : extraction et mise à jour des benchmarks CPU/GPU..."
  npx tsx scripts/seed-hardware.ts || true
fi

echo "🚀 Démarrage de l'application LANSmith sur le port ${PORT:-3000}..."
exec "$@"
