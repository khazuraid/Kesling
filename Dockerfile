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

# ─── Runner stage ─────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs

# Install runtime helpers: psql for migrations and Python/Docling for document import conversion.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    postgresql-client \
    poppler-utils \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    libxrender1 \
    libxext6 \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Docling is installed inside one app image so /form-pemeriksaan import can convert PDFs/DOCX
# without a separate microservice. Use CPU PyTorch wheels to avoid huge CUDA downloads.
RUN python3 -m venv /opt/docling && \
    /opt/docling/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/docling/bin/pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu docling

RUN mkdir -p /opt/docling-models && \
    /opt/docling/bin/python -c "from pathlib import Path; from docling.utils.model_downloader import download_models; download_models(output_dir=Path('/opt/docling-models'), progress=True)"

ENV DOCLING_PYTHON=/opt/docling/bin/python
ENV INSPECTION_IMPORT_ENGINE=docling
ENV DOCLING_TIMEOUT_MS=240000
ENV DOCLING_ARTIFACTS_PATH=/opt/docling-models

# Install ioredis for worker.js runtime
RUN npm install ioredis

# Copy standalone output (Next.js traces deps into this)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/worker.js ./apps/web/worker.js
COPY --from=builder /app/apps/web/inspection-import-parser.js ./apps/web/inspection-import-parser.js

# ─── Prisma 7 engine fix for Next.js standalone ───────────────
# We use wildcard search to find the pnpm hashed folder name
RUN mkdir -p /app/apps/web/node_modules/.prisma/client && \
    export PRISMA_PNPM_DIR=$(find /app/node_modules/.pnpm -name "@prisma+client@7.8.0_*" -type d | head -n 1) && \
    export ENGINE_SOURCE="${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    mkdir -p "${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    cp -r ${ENGINE_SOURCE}/* /app/apps/web/node_modules/.prisma/client/ && \
    echo "Prisma engine OK:" && ls /app/apps/web/node_modules/.prisma/client/

# Copy Prisma migrations + seed for runtime
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /home/nextjs/.cache && \
    chown -R nextjs:nodejs /app/apps/web/.next /app/apps/web/public /app/apps/web/worker.js /app/apps/web/inspection-import-parser.js /home/nextjs/.cache && \
    chown -R nextjs:nodejs /app/apps/web/node_modules/.prisma 2>/dev/null || true && \
    chown -R nextjs:nodejs /app/packages/database/prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
