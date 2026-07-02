ALTER TABLE "Sasaran" DROP CONSTRAINT IF EXISTS "Sasaran_puskesmasId_fkey";
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
