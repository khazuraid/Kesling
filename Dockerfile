FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@11.1.0 --activate

# ─── Deps stage ───────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/

ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=1

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

# Build the web app
RUN pnpm --filter @apps-kes/web build

# ─── Runner stage ─────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (Next.js traces deps into this)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/worker.js ./apps/web/worker.js

# ─── Prisma 7 engine fix for Next.js standalone ───────────────
# We use wildcard search to find the pnpm hashed folder name
RUN mkdir -p /app/apps/web/node_modules/.prisma/client && \
    export PRISMA_PNPM_DIR=$(find /app/node_modules/.pnpm -name "@prisma+client@7.8.0_*" -type d | head -n 1) && \
    export ENGINE_SOURCE="${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    mkdir -p "${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    cp -r ${ENGINE_SOURCE}/* /app/apps/web/node_modules/.prisma/client/ && \
    echo "Prisma engine OK:" && ls /app/apps/web/node_modules/.prisma/client/

# Install postgresql-client for migration/seed via psql (no prisma CLI needed)
RUN apk add --no-cache postgresql-client

# Install ioredis for worker.js runtime
RUN npm install ioredis

# Copy Prisma migrations + seed for runtime
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN chown -R nextjs:nodejs /app/apps/web/.next /app/apps/web/public /app/apps/web/worker.js && \
    chown -R nextjs:nodejs /app/apps/web/node_modules/.prisma 2>/dev/null || true && \
    chown -R nextjs:nodejs /app/packages/database/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
