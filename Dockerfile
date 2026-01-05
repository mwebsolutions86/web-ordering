# Dockerfile optimisé pour Web Ordering (Next.js PWA)
FROM node:18-alpine AS base

# Configuration des arguments
ARG NODE_ENV=production
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Variables d'environnement
ENV NODE_ENV=$NODE_ENV
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Installation des dépendances système pour PWA
FROM base AS deps
RUN apk add --no-cache libc6-compat \
    && apk add --no-cache imagemagick \
    && apk add --no-cache jpegoptim \
    && apk add --no-cache optipng

WORKDIR /app

# Copie des fichiers de dépendances
COPY web-ordering/package.json web-ordering/package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Build de l'application PWA
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web-ordering/ .

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV=production

# Optimisations PWA
RUN npm run build

# Image finale optimisée avec compression d'images
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copie des fichiers de production
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Configuration PWA
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/public/sw.js ./public/sw.js
COPY --from=builder --chown=nextjs:nodejs /app/public/manifest.json ./public/manifest.json
COPY --from=builder --chown=nextjs:nodejs /app/public/offline.html ./public/offline.html

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]