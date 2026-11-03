-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AnnouncementType" AS ENUM ('INFO', 'WARNING', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AnnouncementTargetRole" AS ENUM ('ALL', 'OPERATOR', 'DINKES', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "announcement" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AnnouncementType" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "targetRole" "AnnouncementTargetRole" NOT NULL DEFAULT 'ALL',
    "isPopup" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "announcement_dismissal" (
    "id" SERIAL NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_dismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "announcement_isActive_isPopup_startDate_endDate_targetRole_idx" ON "announcement"("isActive", "isPopup", "startDate", "endDate", "targetRole");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "announcement_dismissal_userId_idx" ON "announcement_dismissal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "announcement_dismissal_announcementId_userId_key" ON "announcement_dismissal"("announcementId", "userId");

-- AddForeignKey
ALTER TABLE "announcement_dismissal" DROP CONSTRAINT IF EXISTS "announcement_dismissal_announcementId_fkey";
ALTER TABLE "announcement_dismissal" ADD CONSTRAINT "announcement_dismissal_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_dismissal" DROP CONSTRAINT IF EXISTS "announcement_dismissal_userId_fkey";
ALTER TABLE "announcement_dismissal" ADD CONSTRAINT "announcement_dismissal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
