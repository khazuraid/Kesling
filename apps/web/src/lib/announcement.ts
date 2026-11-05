import { prisma } from "@apps-kes/database";

let announcementTableEnsured = false;

/**
 * Lazy auto-create tabel announcement, announcement_dismissal & enum AnnouncementType, AnnouncementTargetRole
 * jika belum ada di database produksi.
 */
export async function ensureAnnouncementTables() {
  if (announcementTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'URGENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE "AnnouncementTargetRole" AS ENUM ('ALL', 'OPERATOR', 'DINKES', 'ADMIN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "announcement" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "imageUrl" TEXT,
        "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "endDate" TIMESTAMP(3),
        "targetRole" "AnnouncementTargetRole" NOT NULL DEFAULT 'ALL',
        "isPopup" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "announcement_active_popup_idx"
        ON "announcement"("isActive", "isPopup", "startDate", "endDate", "targetRole");

      CREATE TABLE IF NOT EXISTS "announcement_dismissal" (
        "id" SERIAL PRIMARY KEY,
        "announcementId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "announcement_dismissal_announcementId_fkey"
          FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "announcement_dismissal_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "announcement_dismissal_announcementId_userId_key"
        ON "announcement_dismissal"("announcementId", "userId");
      CREATE INDEX IF NOT EXISTS "announcement_dismissal_userId_idx"
        ON "announcement_dismissal"("userId");
    `);
    announcementTableEnsured = true;
  } catch (err) {
    console.warn("[ensureAnnouncementTables warning]:", err);
  }
}
