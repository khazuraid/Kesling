-- Akun yang dibuat dari seed memakai password sementara dan wajib menggantinya.
-- IF NOT EXISTS wajib: sebagian database sudah punya kolom ini, dan migration
-- yang gagal di sini membuat seluruh query sesi error (aplikasi jadi 401 terus).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- Akun seed yang masih memakai password default (ter-commit) ditandai wajib
-- ganti, agar password sementara itu tidak bisa dipakai mengoperasikan aplikasi.
--
-- Dua hal yang mudah salah di sini:
--   1. Tanpa \if, berkas ini tidak bisa dijalankan tanpa -v seed_pw_hash —
--      dan entrypoint menjalankan setiap berkas migrasi dengan -f.
--   2. WHERE "password" wajib ada. Deploy mengulang berkas migrasi dari awal
--      (ledger diisi belakangan), jadi UPDATE tanpa syarat itu akan menandai
--      ulang pengguna yang sudah mengganti password — terus-menerus.
-- Pencocokan lewat hash, bukan daftar email, supaya akun seed mana pun ikut
-- terjaring tanpa perlu didaftar satu per satu.
\if :{?seed_pw_hash}
UPDATE "user" SET "mustChangePassword" = true WHERE "password" = :'seed_pw_hash';
\endif
