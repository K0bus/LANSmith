# ==========================================
# 1. Étape de dépendances (Deps)
# ==========================================
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# ==========================================
# 2. Étape de compilation (Builder)
# ==========================================
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Génération du client Prisma (moteur Linux musl pour Alpine)
RUN npx prisma generate

# Build Nuxt 4 / Nitro
RUN npm run build

# ==========================================
# 3. Image finale de production (Runner)
# ==========================================
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat dumb-init curl
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NITRO_HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    DATABASE_URL=file:/app/data/lanforge.db \
    NUXT_PUBLIC_APP_NAME=LANSmith \
    AUTO_SEED=false

# Création du dossier pour la base SQLite persistante
RUN mkdir -p /app/data

# Copie des artefacts de build Nuxt et Prisma
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", ".output/server/index.mjs"]
