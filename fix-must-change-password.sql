-- ============================================================
-- PERBAIKAN CEPAT: kolom user.mustChangePassword belum ada di database
-- produksi, sehingga SEMUA permintaan sesi error (JWT_SESSION_ERROR) dan
-- login selalu dijawab 401.
--
-- Jalankan di database produksi:
--   docker exec -i <container-postgres> psql -U postgres -d kesling_cirebon < fix-must-change-password.sql
--
-- Idempoten: aman dijalankan berulang, tidak menghapus/mengubah data akun.
-- ============================================================

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Tandai akun seed (password default) supaya wajib ganti setelah login.
UPDATE "user" SET "mustChangePassword" = true WHERE "email" IN (
  'admin@dinkes.go.id',
  'dinkes@dinkes.go.id',
  'operator@kesambi.go.id'
);

-- Verifikasi: harus mengembalikan satu baris berisi kolom mustChangePassword.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'mustChangePassword';

SELECT email, role, "mustChangePassword" FROM "user" ORDER BY id;
