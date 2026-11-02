-- Menambahkan kolom username resmi ke tabel user
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Buat index unik untuk username (case-insensitive atau unik per nilai tidak null)
CREATE UNIQUE INDEX IF NOT EXISTS "user_username_key" ON "user"("username");
