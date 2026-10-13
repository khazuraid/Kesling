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
    mkdir -p /app/apps/web/node_modules/.prisma/client /home/nextjs/.cache /app/apps/web/public/uploads/mobile && \
    PRISMA_PNPM_DIR=$(find /app/node_modules/.pnpm -name "@prisma+client@*_*" -type d | head -n 1) && \
    ENGINE_SOURCE="${PRISMA_PNPM_DIR}/node_modules/.prisma/client" && \
    cp -r "${ENGINE_SOURCE}"/* /app/apps/web/node_modules/.prisma/client/ && \
    chown -R nextjs:nodejs /app/apps/web/.next /app/apps/web/public /app/apps/web/node_modules/.prisma /app/packages/database/prisma /home/nextjs/.cache

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "apps/web/server.js"]

# ─── Heavy import worker base (cached permanently) ────────────
# Isolated from web-runner/builder so web updates never bust the
# cache of system packages, PyTorch, Docling, or EasyOCR weights.
FROM base AS worker-base
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home --home-dir /home/nextjs nextjs && \
    apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl \
      default-jre-headless libgl1 libglib2.0-0 libxcb1 libxrender1 libxext6 \
      python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/odl-hybrid && \
    /opt/odl-hybrid/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/odl-hybrid/bin/pip install --no-cache-dir \
      --extra-index-url https://download.pytorch.org/whl/cpu "opendataloader-pdf[hybrid]"

# Pre-download docling models and EasyOCR weights so the first job does not fetch them at runtime.
RUN mkdir -p /opt/docling-models/EasyOcr && \
    /opt/odl-hybrid/bin/python -c "\
import io, urllib.request, zipfile; \
from pathlib import Path; \
from docling.utils.model_downloader import download_models; \
download_models(output_dir=Path('/opt/docling-models'), progress=False); \
dest = Path('/opt/docling-models/EasyOcr'); \
urls = [\
  'https://github.com/JaidedAI/EasyOCR/releases/download/pre-v1.1.6/craft_mlt_25k.zip',\
  'https://github.com/JaidedAI/EasyOCR/releases/download/v1.3/latin_g2.zip',\
  'https://github.com/JaidedAI/EasyOCR/releases/download/v1.3/english_g2.zip',\
]; \
[zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})).read())).extractall(dest) for u in urls]" && \
    chown -R nextjs:nodejs /opt/docling-models

# Pre-install worker node dependencies in the base layer
RUN npm install --omit=dev --no-package-lock ioredis @opendataloader/pdf

ENV DOCLING_ARTIFACTS_PATH=/opt/docling-models
ENV HF_HOME=/opt/docling-models
ENV HYBRID_URL=http://127.0.0.1:5002
ENV HYBRID_SECONDS_PER_PAGE=20
ENV HYBRID_MAX_TIMEOUT_MS=1800000

# ─── Lightweight worker runner (instant build) ─────────────────
FROM worker-base AS worker-runner
WORKDIR /app

COPY apps/web/worker.js ./apps/web/worker.js
COPY apps/web/inspection-import-parser.js ./apps/web/inspection-import-parser.js
COPY worker-entrypoint.sh /app/worker-entrypoint.sh
RUN chmod +x /app/worker-entrypoint.sh && \
    chown -R nextjs:nodejs /app/apps/web /app/worker-entrypoint.sh

USER nextjs
ENTRYPOINT ["/app/worker-entrypoint.sh"]
CMD ["node", "apps/web/worker.js"]
