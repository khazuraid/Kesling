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

    # Daftar migrasi yang sudah diterapkan. Tanpa tabel ini, setiap restart
    # menjalankan ulang SEMUA migrasi; berkas migrasi lama tidak semuanya
    # idempoten (banyak CREATE/ALTER tanpa IF NOT EXISTS), sehingga restart
    # pada database yang sudah terisi akan melaporkan kegagalan yang
    # menyesatkan — dan itu menutupi kegagalan yang sungguhan.
    psql "$PSQL_URL" -q -c 'CREATE TABLE IF NOT EXISTS "_prisma_migrations" (migration_name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())' >/dev/null

    MIGRATION_FAILURES=0
    MIGRATION_APPLIED=0
    for migration_dir in "$MIGRATIONS_DIR"/*/; do
      migration_file="$migration_dir/migration.sql"
      if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_dir")

        already_applied=$(psql "$PSQL_URL" -tAc "SELECT 1 FROM \"_prisma_migrations\" WHERE migration_name = '$migration_name'" 2>/dev/null | tr -d '[:space:]')
        if [ "$already_applied" = "1" ]; then
          continue
        fi

        echo "  Applying: $migration_name"
        migration_output=$(psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f "$migration_file" 2>&1)
        migration_status=$?

        if [ "$migration_status" -eq 0 ]; then
          psql "$PSQL_URL" -q -c "INSERT INTO \"_prisma_migrations\" (migration_name) VALUES ('$migration_name') ON CONFLICT DO NOTHING" >/dev/null
          MIGRATION_APPLIED=$((MIGRATION_APPLIED + 1))
          continue
        fi

        # Database yang sudah terisi tetapi belum punya tabel ledger akan
        # menjalankan migrasi lama sekali lagi. Migrasi lama tidak semuanya
        # idempoten, jadi "sudah ada" adalah hasil yang wajar — bukan
        # kegagalan, dan tidak perlu dilaporkan sebagai error.
        if printf '%s' "$migration_output" | grep -qE 'already exists|duplicate key value|multiple primary keys|already a '; then
          psql "$PSQL_URL" -q -c "INSERT INTO \"_prisma_migrations\" (migration_name) VALUES ('$migration_name') ON CONFLICT DO NOTHING" >/dev/null
          echo "    ↷ dilewati (objek sudah ada)"
          MIGRATION_APPLIED=$((MIGRATION_APPLIED + 1))
          continue
        fi

        # Kegagalan sungguhan HARUS terlihat. Sebelumnya error di sini ditelan
        # oleh pola fallback echo, sehingga kolom yang gagal dibuat tidak
        # ketahuan sampai aplikasi menjalankan query lalu gagal saat login.
        echo "  ❌ $migration_name GAGAL — skema database tertinggal dari kode."
        printf '%s\n' "$migration_output" | sed 's/^/      /' | head -20
        MIGRATION_FAILURES=$((MIGRATION_FAILURES + 1))
      fi
    done
    echo "✅ Migrations done! ($MIGRATION_APPLIED baru, $MIGRATION_FAILURES gagal)"
    if [ "$MIGRATION_FAILURES" -gt 0 ]; then
      echo "⚠️  Ada $MIGRATION_FAILURES migration gagal. Aplikasi tetap dijalankan,"
      echo "    tetapi fitur yang bergantung pada kolom/tabel tersebut akan error"
      echo "    sampai perbaikannya diterapkan. Periksa pesan error di atas."
    fi
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
