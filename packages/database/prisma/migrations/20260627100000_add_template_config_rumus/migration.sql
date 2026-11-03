-- AlterTable
ALTER TABLE IF EXISTS "InspectionTemplate" ADD COLUMN IF NOT EXISTS "config" JSONB;
