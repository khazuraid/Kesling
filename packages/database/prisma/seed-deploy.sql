-- ============================================================
-- SEED-DEPLOY: Extension seed for production deployment
-- Run AFTER seed-complete.sql
-- Idempotent — safe to run multiple times
-- ============================================================

-- Ensure tables/columns exist (safe if already migrated)
CREATE TABLE IF NOT EXISTS "app_setting" (
  "id" SERIAL PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- rencana_bulanan (recovery: migration loop may silently fail on pooled URL)
CREATE TABLE IF NOT EXISTS "rencana_bulanan" (
  "id" SERIAL NOT NULL,
  "puskesmasId" INTEGER NOT NULL,
  "sasaranId" INTEGER NOT NULL,
  "bulan" INTEGER NOT NULL,
  "tahun" INTEGER NOT NULL,
  "tanggalRencana" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'TERJADWAL',
  "prioritas" INTEGER NOT NULL DEFAULT 0,
  "catatan" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rencana_bulanan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rencana_bulanan_puskesmasId_sasaranId_bulan_tahun_key"
  ON "rencana_bulanan"("puskesmasId", "sasaranId", "bulan", "tahun");
CREATE INDEX IF NOT EXISTS "rencana_bulanan_puskesmasId_bulan_tahun_idx"
  ON "rencana_bulanan"("puskesmasId", "bulan", "tahun");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rencana_bulanan_puskesmasId_fkey') THEN
    ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_puskesmasId_fkey"
      FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rencana_bulanan_sasaranId_fkey') THEN
    ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_sasaranId_fkey"
      FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 1. APP SETTING DEFAULTS (empty values, just keys)
-- ============================================================

INSERT INTO app_setting (key, value, "updatedAt") VALUES
  ('telegram_bot_token',       '',                            NOW()),
  ('telegram_admin_chat_id',   '',                            NOW()),
  ('telegram_dinkes_chat_id',  '',                            NOW()),
  ('telegram_webhook_secret',  '',                            NOW()),
  ('ai_provider',              'openrouter',                  NOW()),
  ('ai_api_key',               '',                            NOW()),
  ('ai_model',                 'google/gemini-2.5-flash',     NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. USERS
--    All passwords: admin123
--    bcrypt hash: $2b$12$FZeYFvRifBc/FnTgpzQ8LuP1/D9FlTSb7/wGRUtjMziBjf.k57R/a
-- ============================================================

-- DINKES user
INSERT INTO "user" (nama, email, password, role, "createdAt", "updatedAt") VALUES
  ('Dinas Kesehatan', 'dinkes@dinkes.go.id', '$2b$12$FZeYFvRifBc/FnTgpzQ8LuP1/D9FlTSb7/wGRUtjMziBjf.k57R/a', 'DINKES', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Sample operator for Kesambi
INSERT INTO "user" (nama, email, password, role, "puskesmasId", "createdAt", "updatedAt")
SELECT 'Operator Kesambi', 'operator@kesambi.go.id',
       '$2b$12$FZeYFvRifBc/FnTgpzQ8LuP1/D9FlTSb7/wGRUtjMziBjf.k57R/a',
       'OPERATOR', p.id, NOW(), NOW()
FROM puskesmas p
WHERE p.nama = 'Kesambi'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 3. INSPECTION TEMPLATES + FIELDS (global, puskesmasId = NULL)
-- ============================================================

-- Template: Pemeriksaan Depot Air Minum (subCategory: Depot Air Minum under TPP)
INSERT INTO "InspectionTemplate" (nama, deskripsi, "isActive", "puskesmasId", "subCategoryId", "config", "createdAt", "updatedAt")
SELECT 'Pemeriksaan Depot Air Minum',
       'Formulir inspeksi kesehatan lingkungan depot air minum isi ulang.',
       true, NULL, dsc.id, '{}'::jsonb, NOW(), NOW()
FROM dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE dc.code = 'tpp' AND dsc.nama = 'Depot Air Minum'
AND NOT EXISTS (SELECT 1 FROM "InspectionTemplate" t WHERE t.nama = 'Pemeriksaan Depot Air Minum');

INSERT INTO "InspectionField" ("templateId", pertanyaan, tipe, "isRequired", urutan, grup)
SELECT t.id, v.pertanyaan, v.tipe, v.required, v.urutan, v.grup
FROM "InspectionTemplate" t
CROSS JOIN (VALUES
  ('Apakah air baku memenuhi standar fisik (tidak keruh/berbau)?',      'BOOLEAN', true,  1, 'Bahan Baku'),
  ('Apakah peralatan filter & ultraviolet berfungsi dengan baik?',      'BOOLEAN', true,  2, 'Peralatan'),
  ('Apakah operator menjaga kebersihan tangan & pakaian?',              'BOOLEAN', true,  3, 'Penjamah'),
  ('Catatan temuan khusus',                                              'TEXT',    false, 4, 'Lain-lain')
) AS v(pertanyaan, tipe, required, urutan, grup)
WHERE t.nama = 'Pemeriksaan Depot Air Minum'
AND NOT EXISTS (
  SELECT 1 FROM "InspectionField" f WHERE f."templateId" = t.id AND f.pertanyaan = v.pertanyaan
);

-- Template: Pemeriksaan Restoran / Rumah Makan (subCategory: Restoran under TPP)
INSERT INTO "InspectionTemplate" (nama, deskripsi, "isActive", "puskesmasId", "subCategoryId", "config", "createdAt", "updatedAt")
SELECT 'Pemeriksaan Restoran / Rumah Makan',
       'Formulir inspeksi sanitasi dan higiene restoran/rumah makan.',
       true, NULL, dsc.id, '{}'::jsonb, NOW(), NOW()
FROM dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE dc.code = 'tpp' AND dsc.nama = 'Restoran'
AND NOT EXISTS (SELECT 1 FROM "InspectionTemplate" t WHERE t.nama = 'Pemeriksaan Restoran / Rumah Makan');

INSERT INTO "InspectionField" ("templateId", pertanyaan, tipe, "isRequired", urutan, grup)
SELECT t.id, v.pertanyaan, v.tipe, v.required, v.urutan, v.grup
FROM "InspectionTemplate" t
CROSS JOIN (VALUES
  ('Apakah area pengolahan makanan bebas dari vektor penular penyakit (lalat/tikus/kecoa)?', 'BOOLEAN', true,  1, 'Sanitasi Area'),
  ('Apakah bahan makanan disimpan pada suhu yang tepat?',                                      'BOOLEAN', true,  2, 'Penyimpanan'),
  ('Apakah peralatan masak dicuci dengan air bersih & sabun?',                                 'BOOLEAN', true,  3, 'Peralatan'),
  ('Catatan temuan khusus',                                                                    'TEXT',    false, 4, 'Lain-lain')
) AS v(pertanyaan, tipe, required, urutan, grup)
WHERE t.nama = 'Pemeriksaan Restoran / Rumah Makan'
AND NOT EXISTS (
  SELECT 1 FROM "InspectionField" f WHERE f."templateId" = t.id AND f.pertanyaan = v.pertanyaan
);

-- Template: Pemeriksaan Jasaboga (subCategory: Jasaboga under TPP)
INSERT INTO "InspectionTemplate" (nama, deskripsi, "isActive", "puskesmasId", "subCategoryId", "config", "createdAt", "updatedAt")
SELECT 'Pemeriksaan Jasaboga',
       'Formulir inspeksi sanitasi penyelenggaraan jasa boga.',
       true, NULL, dsc.id, '{}'::jsonb, NOW(), NOW()
FROM dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE dc.code = 'tpp' AND dsc.nama = 'Jasaboga'
AND NOT EXISTS (SELECT 1 FROM "InspectionTemplate" t WHERE t.nama = 'Pemeriksaan Jasaboga');

INSERT INTO "InspectionField" ("templateId", pertanyaan, tipe, "isRequired", urutan, grup)
SELECT t.id, v.pertanyaan, v.tipe, v.required, v.urutan, v.grup
FROM "InspectionTemplate" t
CROSS JOIN (VALUES
  ('Apakah dapur memiliki ventilasi yang cukup?',                   'BOOLEAN', true,  1, 'Sanitasi Area'),
  ('Apakah bahan makanan terpisah antara mentah dan matang?',       'BOOLEAN', true,  2, 'Penyimpanan'),
  ('Apakah penjamah makanan menggunakan APD (masker, sarung tangan)?', 'BOOLEAN', true,  3, 'Penjamah'),
  ('Apakah ada tempat sampah tertutup di area dapur?',              'BOOLEAN', true,  4, 'Sanitasi Area'),
  ('Catatan temuan khusus',                                          'TEXT',    false, 5, 'Lain-lain')
) AS v(pertanyaan, tipe, required, urutan, grup)
WHERE t.nama = 'Pemeriksaan Jasaboga'
AND NOT EXISTS (
  SELECT 1 FROM "InspectionField" f WHERE f."templateId" = t.id AND f.pertanyaan = v.pertanyaan
);

-- Template: Pemeriksaan Rumah Sehat (subCategory: NULL, category: rumah — isRowBased=false)
INSERT INTO "InspectionTemplate" (nama, deskripsi, "isActive", "puskesmasId", "subCategoryId", "config", "createdAt", "updatedAt")
SELECT 'Pemeriksaan Rumah Sehat',
       'Formulir inspeksi kelayakan sanitasi rumah tinggal.',
       true, NULL, NULL, '{}'::jsonb, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "InspectionTemplate" t WHERE t.nama = 'Pemeriksaan Rumah Sehat');

INSERT INTO "InspectionField" ("templateId", pertanyaan, tipe, "isRequired", urutan, grup)
SELECT t.id, v.pertanyaan, v.tipe, v.required, v.urutan, v.grup
FROM "InspectionTemplate" t
CROSS JOIN (VALUES
  ('Apakah ventilasi rumah memenuhi syarat?',           'BOOLEAN', true,  1, 'Ventilasi'),
  ('Apakah penerangan rumah memenuhi syarat?',          'BOOLEAN', true,  2, 'Penerangan'),
  ('Apakah lantai rumah kedap air?',                    'BOOLEAN', true,  3, 'Lantai'),
  ('Apakah kepadatan huni memenuhi syarat?',            'BOOLEAN', true,  4, 'Kepadatan Huni'),
  ('Apakah terdapat lubang asap dapur?',                'BOOLEAN', true,  5, 'Lubang Asap'),
  ('Apakah jamban memenuhi syarat kesehatan?',          'BOOLEAN', true,  6, 'Jamban'),
  ('Apakah sarana air bersih memenuhi syarat?',         'BOOLEAN', true,  7, 'Air Bersih'),
  ('Apakah pembuangan air limbah memenuhi syarat?',     'BOOLEAN', true,  8, 'Air Limbah'),
  ('Apakah pembuangan sampah memenuhi syarat?',         'BOOLEAN', true,  9, 'Sampah'),
  ('Apakah kandang ternak terpisah dari rumah?',        'BOOLEAN', true, 10, 'Kandang'),
  ('Catatan temuan khusus',                              'TEXT',    false, 11, 'Lain-lain')
) AS v(pertanyaan, tipe, required, urutan, grup)
WHERE t.nama = 'Pemeriksaan Rumah Sehat'
AND NOT EXISTS (
  SELECT 1 FROM "InspectionField" f WHERE f."templateId" = t.id AND f.pertanyaan = v.pertanyaan
);

-- ============================================================
-- 4. SAMPLE SASARAN (Kesambi)
-- ============================================================

INSERT INTO "Sasaran" (nama, alamat, pemilik, kontak, "puskesmasId", "subCategoryId", lat, lng, "dataDinamis", "createdAt", "updatedAt")
SELECT 'Depot Air Minum Biru Kesambi',
       'Jl. Kesambi No. 123, Cirebon',
       'Bpk. Joko', '08123456789',
       p.id, dsc.id, -6.723, 108.556, '{}'::jsonb, NOW(), NOW()
FROM puskesmas p
CROSS JOIN dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE p.nama = 'Kesambi' AND dc.code = 'tpp' AND dsc.nama = 'Depot Air Minum'
AND NOT EXISTS (SELECT 1 FROM "Sasaran" s WHERE s.nama = 'Depot Air Minum Biru Kesambi');

INSERT INTO "Sasaran" (nama, alamat, pemilik, kontak, "puskesmasId", "subCategoryId", lat, lng, "dataDinamis", "createdAt", "updatedAt")
SELECT 'Restoran KFC Kesambi',
       'Jl. Kesambi Raya No. 45, Cirebon',
       'PT. Fast Food Indonesia', '0231-987654',
       p.id, dsc.id, -6.724, 108.557, '{}'::jsonb, NOW(), NOW()
FROM puskesmas p
CROSS JOIN dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE p.nama = 'Kesambi' AND dc.code = 'tpp' AND dsc.nama = 'Restoran'
AND NOT EXISTS (SELECT 1 FROM "Sasaran" s WHERE s.nama = 'Restoran KFC Kesambi');

INSERT INTO "Sasaran" (nama, alamat, pemilik, kontak, "puskesmasId", "subCategoryId", lat, lng, "dataDinamis", "createdAt", "updatedAt")
SELECT 'Warteg Barokah Kejaksan',
       'Jl. Kejaksan No. 8, Cirebon',
       'Ibu Nur', '081298765432',
       p.id, dsc.id, -6.720, 108.550, '{}'::jsonb, NOW(), NOW()
FROM puskesmas p
CROSS JOIN dynamic_sub_category dsc
JOIN dynamic_category dc ON dsc."categoryId" = dc.id
WHERE p.nama = 'Kejaksan' AND dc.code = 'tpp' AND dsc.nama = 'Jasaboga'
AND NOT EXISTS (SELECT 1 FROM "Sasaran" s WHERE s.nama = 'Warteg Barokah Kejaksan');

-- ============================================================
-- 5. DYNAMIC TARGETS (current year, global baseline 80%)
-- ============================================================

INSERT INTO dynamic_target (tahun, "categoryId", "puskesmasId", "targetPersen", "createdAt", "updatedAt")
SELECT EXTRACT(YEAR FROM NOW())::int, dc.id, NULL, 80.0, NOW(), NOW()
FROM dynamic_category dc
WHERE NOT EXISTS (
  SELECT 1 FROM dynamic_target dt
  WHERE dt.tahun = EXTRACT(YEAR FROM NOW())::int
    AND dt."categoryId" = dc.id
    AND dt."puskesmasId" IS NULL
);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT '=== SEED-DEPLOY COMPLETE ===' AS status;
SELECT 'AppSettings'          AS table_name, COUNT(*) AS count FROM app_setting
UNION ALL SELECT 'Users',               COUNT(*) FROM "user"
UNION ALL SELECT 'InspectionTemplates', COUNT(*) FROM "InspectionTemplate"
UNION ALL SELECT 'InspectionFields',    COUNT(*) FROM "InspectionField"
UNION ALL SELECT 'Sasarans',            COUNT(*) FROM "Sasaran"
UNION ALL SELECT 'DynamicTargets',      COUNT(*) FROM dynamic_target;
