FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma/schema.prisma ./packages/database/prisma/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm rebuild
# Explicitly generate Prisma client + download engine binaries in deps stage
RUN cd packages/database && npx prisma generate

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .
# Re-generate to ensure schema changes are picked up
RUN cd packages/database && npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV ESLINT_NO_DEV_ERRORS=true
ENV NEXT_PRIVATE_STANDALONE=true
RUN cd apps/web && npx next build
# Verify engine exists (fail fast if not)
RUN find /app/node_modules -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" | head -1 | xargs ls -la

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy Prisma query engine binary to all locations Prisma searches at runtime
RUN --mount=from=builder,source=/app/node_modules,target=/tmp/nm \
    ENGINE=$(find /tmp/nm -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" -print -quit) && \
    if [ -z "$ENGINE" ]; then echo "ERROR: Prisma engine not found!" && exit 1; fi && \
    cp "$ENGINE" ./apps/web/.next/server/ && \
    cp "$ENGINE" ./packages/database/prisma/

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
