#!/bin/sh
set -e

# Print masked environment variables for debugging
node -e "
const envs = process.env;
for (const key in envs) {
  if (key.includes('URL') || key.includes('PASSWORD') || key.includes('SECRET') || key.includes('POSTGRES') || key.includes('DB')) {
    const val = envs[key];
    const masked = val ? val.replace(/:[^@]*@/g, ':***@') : 'undefined/empty';
    console.log('🔍 Env: ' + key + ' = ' + masked);
  }
}
"

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
until node -e "
const { URL } = require('url');
const net = require('net');
try {
  const urlStr = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://postgres:password@postgres:5432/kesling_cirebon';
  const parsed = new URL(urlStr);
  const host = parsed.hostname;
  const port = parsed.port || 5432;
  const c = net.createConnection({host, port}, () => { c.end(); process.exit(0); });
  c.on('error', () => { c.end(); process.exit(1); });
  setTimeout(() => { c.end(); process.exit(1); }, 2000);
} catch (e) {
  process.exit(1);
}
" 2>/dev/null; do
  echo "  PostgreSQL unavailable - retrying..."
  sleep 2
done
echo "✅ PostgreSQL ready!"

# Build psql connection string from direct DB URL (bypass PgBouncer for migrations/DDL)
# DATABASE_URL is runtime pooled URL; DIRECT_DATABASE_URL is direct Postgres URL.
# We use Node.js to safely validate and normalize the database URL (replacing localhost with postgres container hostname).
PSQL_URL=$(node -e "
const { URL } = require('url');
let urlStr = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!urlStr || urlStr.trim() === '') {
  const password = process.env.SERVICE_PASSWORD_POSTGRES || '';
  urlStr = 'postgresql://postgres:' + encodeURIComponent(password) + '@postgres:5432/kesling_cirebon';
} else {
  try {
    const parsed = new URL(urlStr);
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || !parsed.hostname) {
      parsed.hostname = 'postgres';
    }
    urlStr = parsed.toString();
  } catch (e) {
    const password = process.env.SERVICE_PASSWORD_POSTGRES || '';
    urlStr = 'postgresql://postgres:' + encodeURIComponent(password) + '@postgres:5432/kesling_cirebon';
  }
}
console.log(urlStr);
")

echo "🔍 Connection URL configured: $(echo "$PSQL_URL" | sed 's/:[^@]*@/:***@/')"

# Argumen -v untuk seed: password default tidak lagi di-hardcode di SQL.
# Tanpa SEED_DEFAULT_PASSWORD_HASH, seed-deploy melewatkan seluruh blok user.
SEED_PSQL_ARGS=""
if [ -n "${SEED_DEFAULT_PASSWORD_HASH:-}" ]; then
  SEED_PSQL_ARGS="-v seed_pw_hash=${SEED_DEFAULT_PASSWORD_HASH}"
else
  echo "🔐 SEED_DEFAULT_PASSWORD_HASH kosong — user seed dengan password default dilewati."
fi

# Run migrations via psql (avoids @prisma/config dependency in runner)
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  MIGRATIONS_DIR="/app/packages/database/prisma/migrations"
  if [ -d "$MIGRATIONS_DIR" ]; then
    echo "📦 Running migrations via psql..."
    MIGRATION_FAILURES=0
    for migration_dir in "$MIGRATIONS_DIR"/*/; do
      migration_file="$migration_dir/migration.sql"
      if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_dir")
        echo "  Applying: $migration_name"
        if ! psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$migration_file" 2>&1; then
          # Kegagalan migration HARUS terlihat. Sebelumnya error di sini
          # ditelan oleh `|| echo`, sehingga kolom yang gagal dibuat tidak
          # ketahuan sampai aplikasi menjalankan query dan gagal saat login.
          echo "  ❌ $migration_name GAGAL — skema database tertinggal dari kode."
          MIGRATION_FAILURES=$((MIGRATION_FAILURES + 1))
        fi
      fi
    done
    if [ "$MIGRATION_FAILURES" -gt 0 ]; then
      echo "⚠️  $MIGRATION_FAILURES migration gagal. Aplikasi tetap dijalankan, tetapi"
      echo "    fitur yang bergantung pada kolom/tabel tersebut akan error sampai"
      echo "    perbaikannya diterapkan. Periksa pesan error di atas."
    fi
    echo "✅ Migrations done!"
  else
    echo "⚠️ No migrations directory found, skipping."
  fi

  # Run seeds (idempotent - uses ON CONFLICT / IF NOT EXISTS)
  for SEED_FILE in /app/packages/database/prisma/seed-complete.sql /app/packages/database/prisma/seed-deploy.sql; do
    if [ -f "$SEED_FILE" ]; then
      echo "🌱 Running seed: $(basename "$SEED_FILE")..."
      # shellcheck disable=SC2086 # SEED_PSQL_ARGS sengaja di-split jadi kata
      psql "$PSQL_URL" $SEED_PSQL_ARGS -f "$SEED_FILE" 2>&1 || echo "⚠️ $(basename "$SEED_FILE") completed with warnings (expected if data exists)."
      echo "✅ $(basename "$SEED_FILE") done!"
    else
      echo "⚠️ No seed file found at $SEED_FILE, skipping."
    fi
  done
else
  echo "⏭️ RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}, skipping DB migrations and seed."
fi


# Ensure server.js resolvable in both paths
if [ ! -f "/app/apps/web/server.js" ] && [ -f "/app/server.js" ]; then
  mkdir -p /app/apps/web
  ln -sf /app/server.js /app/apps/web/server.js
elif [ -f "/app/apps/web/server.js" ] && [ ! -f "/app/server.js" ]; then
  ln -sf /app/apps/web/server.js /app/server.js
fi

# Ensure uploads directory structure exists and is writable
mkdir -p /app/apps/web/public/uploads/inspections /app/apps/web/public/uploads/mobile /app/public/uploads
if [ -d "/app/apps/web/public/uploads" ] && [ ! -e "/app/public/uploads/inspections" ]; then
  ln -sf /app/apps/web/public/uploads/* /app/public/uploads/ 2>/dev/null || true
fi

# Auto-start background inspection queue worker
if [ "${DISABLE_INTERNAL_WORKER:-0}" != "1" ] && [ -f "/app/apps/web/worker.js" ]; then
  echo "👷 Starting background queue worker..."
  node /app/apps/web/worker.js &
fi

# Start app
echo "🚀 Starting apps-kes..."
exec "$@"
