import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pgPool: Pool;
  bootstrapPromise?: Promise<void>;
};

const pgPool = globalForPrisma.pgPool || new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pgPool);

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

/**
 * Self-healing schema bootstrap:
 * Memastikan kolom-kolom baru seperti 'username' pada tabel 'user' selalu ada di database fisik,
 * mencegah kegagalan login jika deployment container mendahului migrasi atau psql migration terlewat.
 */
export async function ensureDbSchema(): Promise<void> {
  if (!globalForPrisma.bootstrapPromise) {
    globalForPrisma.bootstrapPromise = (async () => {
      try {
        await pgPool.query(`
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" TEXT;
          CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");
        `);
      } catch (err: any) {
        // Jangan crash jika tabel belum dibuat sama sekali saat awal setup
        console.warn("[DB Bootstrap] Schema verify notice:", err?.message);
      }
    })();
  }
  return globalForPrisma.bootstrapPromise;
}

// Jalankan otomatis di background saat modul dimuat
ensureDbSchema();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pgPool;
}

export * from "@prisma/client";
