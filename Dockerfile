FROM node:22-bookworm-slim AS base
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

# ─── Lightweight web runtime ──────────────────────────────────
FROM base AS web-runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs && \
    apt-get update && apt-get install -y --no-install-recommends ca-certificates postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Next.js standalone output already contains traced production dependencies.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh && \
    mkdir -p /app/apps/web/node_modules/.prisma/client /home/nextjs/.cache && \
    PRISMA_PNPM_DIR=$(find /app/node_modules/.pnpm -name "@prisma+client@*_*" -type d | head -n 1) && \
    ENGINE_SOURCE="${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    cp -r "${ENGINE_SOURCE}"/* /app/apps/web/node_modules/.prisma/client/ && \
    chown -R nextjs:nodejs /app/apps/web/.next /app/apps/web/public /app/apps/web/node_modules/.prisma /app/packages/database/prisma /home/nextjs/.cache

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]

# ─── Heavy import worker runtime ──────────────────────────────
# Built only when worker/parser dependencies change. The web image never
# contains Python, Torch, OpenCV, Docling, or downloaded document models.
FROM web-runner AS worker-runner
USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils libgl1 libglib2.0-0 libxcb1 libxrender1 libxext6 \
    python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/docling && \
    /opt/docling/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/docling/bin/pip install --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cpu "docling==2.113.0"

RUN mkdir -p /opt/docling-models && \
    /opt/docling/bin/python -c "from pathlib import Path; from docling.utils.model_downloader import download_models; download_models(output_dir=Path('/opt/docling-models'), progress=True)"

ENV DOCLING_PYTHON=/opt/docling/bin/python
ENV INSPECTION_IMPORT_ENGINE=docling
ENV DOCLING_TIMEOUT_MS=240000
ENV DOCLING_ARTIFACTS_PATH=/opt/docling-models

COPY --from=builder /app/apps/web/worker.js ./apps/web/worker.js
COPY --from=builder /app/apps/web/inspection-import-parser.js ./apps/web/inspection-import-parser.js
RUN npm install --omit=dev --no-package-lock ioredis && \
    chown nextjs:nodejs /app/apps/web/worker.js /app/apps/web/inspection-import-parser.js && \
    chown -R nextjs:nodejs /opt/docling-models

USER nextjs
CMD ["node", "apps/web/worker.js"]
