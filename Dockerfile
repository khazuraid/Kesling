# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@11.1.0 --activate

# ─── Deps stage ───────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/

ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=1

# ─── Build stage ──────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=2048"
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules

COPY . .

# Generate Prisma client BEFORE Next.js build
RUN pnpm --filter @apps-kes/database generate

# Build the web app with incremental cache mount
RUN --mount=type=cache,target=/app/apps/web/.next/cache \
    pnpm --filter @apps-kes/web build

# ─── Lightweight web runtime ──────────────────────────────────
FROM base AS web-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_PATH="/app/node_modules:/app/apps/web/node_modules"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs && \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates postgresql-client default-jre-headless && \
    rm -rf /var/lib/apt/lists/*

# Next.js standalone output already contains traced production dependencies.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY apps/web/worker.js ./apps/web/worker.js
COPY apps/web/inspection-import-parser.js ./apps/web/inspection-import-parser.js
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN npm install --omit=dev --no-package-lock ioredis @opendataloader/pdf && \
    chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/apps/web/node_modules/.prisma/client /home/nextjs/.cache /app/apps/web/public/uploads/mobile && \
    PRISMA_PNPM_DIR=$(find /app/node_modules/.pnpm -name "@prisma+client@*_*" -type d | head -n 1) && \
    if [ -n "$PRISMA_PNPM_DIR" ]; then \
      ENGINE_SOURCE="${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
      cp -r "${ENGINE_SOURCE}"/* /app/apps/web/node_modules/.prisma/client/; \
    fi && \
    if [ ! -f "/app/apps/web/server.js" ] && [ -f "/app/server.js" ]; then mkdir -p /app/apps/web && ln -sf /app/server.js /app/apps/web/server.js; fi && \
    if [ -f "/app/apps/web/server.js" ] && [ ! -f "/app/server.js" ]; then ln -sf /app/apps/web/server.js /app/server.js; fi && \
    chown -R nextjs:nodejs /app/apps/web /app/packages/database/prisma /app/node_modules /home/nextjs/.cache

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
