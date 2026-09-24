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

# Seed de démonstration (joueurs, jeux, tournois) SEULEMENT si AUTO_SEED=true (désactivé par défaut)
if [ "$AUTO_SEED" = "true" ]; then
  echo "🌱 AUTO_SEED=true : insertion des données de démonstration (jeux, joueurs, tournois)..."
  node prisma/seed.js || true
fi

# Seed des benchmarks GPU/CPU : automatique si la table hardware est vide OU si SEED_HARDWARE=true
CHECK_HW=0
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
Promise.all([p.benchmarkGpu.count(), p.benchmarkCpu.count()]).then(([g, c]) => {
  if (g === 0 && c === 0) process.exit(10);
  process.exit(0);
}).catch(() => process.exit(0)).finally(() => p.\$disconnect());
" 2>/dev/null || CHECK_HW=$?

if [ "$SEED_HARDWARE" = "true" ] || [ "$CHECK_HW" = "10" ]; then
  echo "⚡ Initialisation / Mise à jour du catalogue de benchmarks GPU & CPU (PassMark)..."
  npx tsx scripts/seed-hardware.ts || true
else
  echo "✅ Catalogue hardware déjà indexé."
fi

echo "🚀 Démarrage de l'application LANSmith sur le port ${PORT:-3000}..."
exec "$@"
