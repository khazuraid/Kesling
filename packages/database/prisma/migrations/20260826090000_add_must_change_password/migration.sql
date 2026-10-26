-- Akun yang dibuat dari seed memakai password sementara dan wajib menggantinya.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Akun seed yang sudah ada (password default ter-commit) ditandai wajib ganti
-- agar password sementara itu tidak bisa dipakai untuk mengoperasikan aplikasi.
UPDATE "user" SET "mustChangePassword" = true WHERE "email" IN (
  'admin@dinkes.go.id',
  'dinkes@dinkes.go.id',
  'operator@kesambi.go.id'
);
