# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.0 --activate

# --- Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma/schema.prisma ./packages/database/prisma/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild
RUN cd packages/database && npx prisma generate

# --- Build application ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app ./
COPY . .
RUN cd packages/database && npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npx next build

# --- Production runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
RUN apk add --no-cache curl

# Copy standalone output (includes node_modules traced from monorepo root)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Copy Prisma schema (for migrations) and engine binary
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
RUN --mount=from=builder,source=/app/node_modules,target=/tmp/nm \
    ENGINE=$(find /tmp/nm -name "libquery_engine-linux-musl-openssl-3.0.x.so.node" -print -quit) && \
    if [ -z "$ENGINE" ]; then echo "ERROR: Prisma engine not found!" && exit 1; fi && \
    cp "$ENGINE" ./apps/web/.next/server/ && \
    cp "$ENGINE" ./packages/database/prisma/

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
