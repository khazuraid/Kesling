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
 * Memastikan kolom-kolom baru seperti 'username' pada tabel 'user' serta tabel baru
 * seperti 'announcement' & 'announcement_dismissal' selalu ada di database fisik,
 * mencegah kegagalan jika deployment container mendahului migrasi atau psql migration terlewat.
 */
export async function ensureDbSchema(): Promise<void> {
  if (!globalForPrisma.bootstrapPromise) {
    globalForPrisma.bootstrapPromise = (async () => {
      try {
        await pgPool.query(`
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" TEXT;
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "lastOtpVerifiedAt" TIMESTAMP(3);
          CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");

          DO $$ BEGIN
            CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED');
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;

          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "status" "UserStatus" DEFAULT 'ACTIVE';
          UPDATE "user" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approvedById" INTEGER;
          ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
          CREATE INDEX IF NOT EXISTS "user_status_idx" ON "user"("status");

          DO $$ BEGIN
            CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'URGENT');
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;

          DO $$ BEGIN
            CREATE TYPE "AnnouncementTargetRole" AS ENUM ('ALL', 'OPERATOR', 'DINKES', 'ADMIN');
          EXCEPTION
            WHEN duplicate_object THEN NULL;
          END $$;

          CREATE TABLE IF NOT EXISTS "announcement" (
            "id" SERIAL PRIMARY KEY,
            "title" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "endDate" TIMESTAMP(3),
            "targetRole" "AnnouncementTargetRole" NOT NULL DEFAULT 'ALL',
            "isPopup" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS "announcement_isActive_isPopup_startDate_endDate_targetRole_idx"
            ON "announcement"("isActive", "isPopup", "startDate", "endDate", "targetRole");

          CREATE TABLE IF NOT EXISTS "announcement_dismissal" (
            "id" SERIAL PRIMARY KEY,
            "announcementId" INTEGER NOT NULL REFERENCES "announcement"("id") ON DELETE CASCADE,
            "userId" INTEGER NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
            "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "announcement_dismissal_announcementId_userId_key" UNIQUE ("announcementId", "userId")
          );

          CREATE INDEX IF NOT EXISTS "announcement_dismissal_userId_idx"
            ON "announcement_dismissal"("userId");
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
