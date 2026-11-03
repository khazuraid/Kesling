-- CreateEnum: UserStatus
DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('PENDING_EMAIL', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: Add status columns to user table with default ACTIVE for existing records
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "approvedById" INTEGER;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

-- Ensure all pre-existing records have ACTIVE status
UPDATE "user" SET "status" = 'ACTIVE' WHERE "status" IS NULL;

-- Set default to PENDING_EMAIL for new registrations
ALTER TABLE "user" ALTER COLUMN "status" SET DEFAULT 'PENDING_EMAIL';

-- AddForeignKey if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_approvedById_fkey') THEN
    ALTER TABLE "user" ADD CONSTRAINT "user_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_status_idx" ON "user"("status");
