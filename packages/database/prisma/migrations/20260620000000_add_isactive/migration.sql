-- AlterTable: add isActive column to dynamic_category
ALTER TABLE "dynamic_category" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
