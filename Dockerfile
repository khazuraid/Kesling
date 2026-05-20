FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --ignore-scripts && pnpm rebuild

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY . .
RUN cd packages/database && npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd apps/web && npx next build
RUN cp -r /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma /app/.prisma-engines 2>/dev/null || true

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "apps/web/server.js"]
