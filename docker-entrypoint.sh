#!/bin/sh
set -e

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
PSQL_URL="${DIRECT_DATABASE_URL:-$DATABASE_URL}"
PSQL_CMD="psql \"$PSQL_URL\""

# Run migrations via psql (avoids @prisma/config dependency in runner)
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  MIGRATIONS_DIR="/app/packages/database/prisma/migrations"
  if [ -d "$MIGRATIONS_DIR" ]; then
    echo "📦 Running migrations via psql..."
    for migration_dir in "$MIGRATIONS_DIR"/*/; do
      migration_file="$migration_dir/migration.sql"
      if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_dir")
        echo "  Applying: $migration_name"
        eval "$PSQL_CMD -f \"$migration_file\"" 2>&1 || echo "  ⚠️  $migration_name had warnings (may already exist)"
      fi
    done
    echo "✅ Migrations done!"
  else
    echo "⚠️ No migrations directory found, skipping."
  fi

  # Run seed (idempotent - uses ON CONFLICT / IF NOT EXISTS)
  SEED_FILE="/app/packages/database/prisma/seed-complete.sql"
  if [ -f "$SEED_FILE" ]; then
    echo "🌱 Running seed..."
    eval "$PSQL_CMD -f \"$SEED_FILE\"" 2>&1 || echo "⚠️ Seed completed with warnings (expected if data exists)."
    echo "✅ Seed done!"
  else
    echo "⚠️ No seed file found at $SEED_FILE, skipping."
  fi
else
  echo "⏭️ RUN_MIGRATIONS=${RUN_MIGRATIONS:-0}, skipping DB migrations and seed."
fi


# Start app
echo "🚀 Starting apps-kes..."
exec "$@"
