-- ============================================================
-- COMPLETE SEED SCRIPT - Run via: docker compose exec postgres psql -U postgres -d kesling_cirebon -f /tmp/seed-complete.sql
-- ============================================================

-- Ensure missing columns exist (schema sync)
ALTER TABLE dynamic_category ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE dynamic_parameter ADD COLUMN IF NOT EXISTS "isBaseline" BOOLEAN DEFAULT false;
ALTER TABLE dynamic_sub_category ADD COLUMN IF NOT EXISTS "grup" TEXT;

-- ============================================================
-- 1. MASTER DATA (skip if exists)
-- ============================================================

-- Puskesmas
INSERT INTO puskesmas (nama, urutan, "createdAt", "updatedAt") VALUES
  ('Kejaksan', 1, NOW(), NOW()),
  ('Nelayan', 2, NOW(), NOW()),
  ('Pamitran', 3, NOW(), NOW()),
  ('Jalan Kembang', 4, NOW(), NOW()),
  ('Gunung Sari', 5, NOW(), NOW()),
  ('Kesambi', 6, NOW(), NOW()),
  ('Majasem', 7, NOW(), NOW()),
  ('Sunyaragi', 8, NOW(), NOW()),
  ('Drajat', 9, NOW(), NOW()),
  ('Jagasatru', 10, NOW(), NOW()),
  ('Pulasaren', 11, NOW(), NOW()),
  ('Astanagarib', 12, NOW(), NOW()),
  ('Pekalangan', 13, NOW(), NOW()),
  ('Pesisir', 14, NOW(), NOW()),
  ('Cangkol', 15, NOW(), NOW()),
  ('Kesunean', 16, NOW(), NOW()),
  ('Pegambiran', 17, NOW(), NOW()),
  ('Perumnas Utara', 18, NOW(), NOW()),
  ('Larangan', 19, NOW(), NOW()),
  ('Kalijaga', 20, NOW(), NOW()),
  ('Kalitanjung', 21, NOW(), NOW())
ON CONFLICT (nama) DO NOTHING;

-- Jenis TPP
INSERT INTO jenis_tpp (nama, urutan, "createdAt", "updatedAt") VALUES
  ('Jasaboga', 1, NOW(), NOW()),
  ('Restoran', 2, NOW(), NOW()),
  ('Rumah Makan', 3, NOW(), NOW()),
  ('TPP Tertentu', 4, NOW(), NOW()),
  ('Depot Air Minum', 5, NOW(), NOW()),
  ('Dapur Gerai Pangan Jajanan', 6, NOW(), NOW()),
  ('Gerai Pangan Jajanan', 7, NOW(), NOW()),
  ('Gerai Pangan Jajanan Keliling', 8, NOW(), NOW()),
  ('Pangan Jajanan Keliling Gerobak', 9, NOW(), NOW()),
  ('Sentra Pangan Jajanan/Kantin', 10, NOW(), NOW())
ON CONFLICT (nama) DO NOTHING;

-- Jenis Sarana SPAL
INSERT INTO jenis_sarana (nama, kategori, urutan, "createdAt", "updatedAt") VALUES
  ('Riool', 'SPAL', 1, NOW(), NOW()),
  ('Septick Tank', 'SPAL', 2, NOW(), NOW()),
  ('Sumur Resapan', 'SPAL', 3, NOW(), NOW()),
  ('Saluran Tertutup', 'SPAL', 4, NOW(), NOW()),
  ('Saluran Terbuka', 'SPAL', 5, NOW(), NOW()),
  ('Sungai', 'SPAL', 6, NOW(), NOW()),
  ('Sarana Umum', 'SPAL', 7, NOW(), NOW()),
  ('Tidak Ada Sarana', 'SPAL', 8, NOW(), NOW())
ON CONFLICT (nama, kategori) DO NOTHING;

-- Jenis Sarana SAB
INSERT INTO jenis_sarana (nama, kategori, urutan, "createdAt", "updatedAt") VALUES
  ('SGL Terlindung', 'SAB', 1, NOW(), NOW()),
  ('SGL dengan Pompa', 'SAB', 2, NOW(), NOW()),
  ('Sumur Bor dengan Pompa', 'SAB', 3, NOW(), NOW()),
  ('SPT', 'SAB', 4, NOW(), NOW()),
  ('PP/PDAM/SR', 'SAB', 5, NOW(), NOW()),
  ('Sarana Umum', 'SAB', 6, NOW(), NOW())
ON CONFLICT (nama, kategori) DO NOTHING;

-- Jenis Sarana Jamban
INSERT INTO jenis_sarana (nama, kategori, urutan, "createdAt", "updatedAt") VALUES
  ('Leher Angsa + Septick Tank', 'JAMBAN', 1, NOW(), NOW()),
  ('LA + Riool', 'JAMBAN', 2, NOW(), NOW()),
  ('LA + Sungai', 'JAMBAN', 3, NOW(), NOW()),
  ('LA + Cubluk', 'JAMBAN', 4, NOW(), NOW()),
  ('Pelengsengan', 'JAMBAN', 5, NOW(), NOW()),
  ('Cemplung', 'JAMBAN', 6, NOW(), NOW()),
  ('Sarana Umum', 'JAMBAN', 7, NOW(), NOW()),
  ('Tidak Ada Sarana', 'JAMBAN', 8, NOW(), NOW())
ON CONFLICT (nama, kategori) DO NOTHING;

-- Jenis TTU Prioritas
INSERT INTO jenis_ttu (nama, kategori, urutan, "createdAt", "updatedAt") VALUES
  ('SD/MI', 'PRIORITAS', 1, NOW(), NOW()),
  ('SMP/MTS', 'PRIORITAS', 2, NOW(), NOW()),
  ('SMA/MA', 'PRIORITAS', 3, NOW(), NOW()),
  ('Pasar', 'PRIORITAS', 4, NOW(), NOW()),
  ('Terminal', 'PRIORITAS', 5, NOW(), NOW()),
  ('Pelabuhan', 'PRIORITAS', 6, NOW(), NOW()),
  ('Bandara', 'PRIORITAS', 7, NOW(), NOW()),
  ('Akomodasi/Hotel', 'PRIORITAS', 8, NOW(), NOW()),
  ('Stasiun', 'PRIORITAS', 9, NOW(), NOW()),
  ('Tempat Rekreasi', 'PRIORITAS', 10, NOW(), NOW()),
  ('Tempat Olah Raga', 'PRIORITAS', 11, NOW(), NOW()),
  ('Mesjid/Gereja/Vihara', 'PRIORITAS', 12, NOW(), NOW())
ON CONFLICT (nama, kategori) DO NOTHING;

-- Jenis TTU Non-Prioritas
INSERT INTO jenis_ttu (nama, kategori, urutan, "createdAt", "updatedAt") VALUES
  ('Puskesmas', 'NON_PRIORITAS', 1, NOW(), NOW()),
  ('Praktik Mandiri', 'NON_PRIORITAS', 2, NOW(), NOW()),
  ('Pustu', 'NON_PRIORITAS', 3, NOW(), NOW()),
  ('Apotik', 'NON_PRIORITAS', 4, NOW(), NOW()),
  ('Perkantoran', 'NON_PRIORITAS', 5, NOW(), NOW()),
  ('Musholla', 'NON_PRIORITAS', 6, NOW(), NOW()),
  ('TK/KB', 'NON_PRIORITAS', 7, NOW(), NOW()),
  ('TFU Lainnya', 'NON_PRIORITAS', 8, NOW(), NOW())
ON CONFLICT (nama, kategori) DO NOTHING;

-- Admin User (bcrypt hash for 'admin123')
INSERT INTO "user" (nama, email, password, role, "createdAt", "updatedAt") VALUES
  ('Administrator', 'admin@dinkes.go.id', '$2b$12$FZeYFvRifBc/FnTgpzQ8LuP1/D9FlTSb7/wGRUtjMziBjf.k57R/a', 'ADMIN', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. DYNAMIC CATEGORIES
-- ============================================================

-- TPP
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Tempat Pengolahan Pangan (TPP)', 'tpp', 'Pengawasan dan pembinaan tempat pengolahan makanan/minuman agar memenuhi syarat higienitas.', '🍳', 1, true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- SPAL
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Saluran Pembuangan Air Limbah (SPAL)', 'spal', 'Pengawasan kualitas sarana pembuangan air limbah rumah tangga.', '🚰', 2, true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- SAB
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Sarana Air Bersih (SAB)', 'sab', 'Pengawasan kualitas dan higienitas sarana air bersih / air minum.', '💧', 3, true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- JAMBAN
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Jamban Keluarga (Sanitasi Aman)', 'jamban', 'Pengawasan terhadap kualitas fasilitas pembuangan tinja keluarga.', '🚽', 4, true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- RUMAH
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Rumah Sehat', 'rumah', 'Evaluasi kelayakan sanitasi rumah tinggal berdasarkan berbagai aspek kenyamanan dan kebersihan.', '🏠', 5, false, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- TTU
INSERT INTO dynamic_category (nama, code, deskripsi, icon, urutan, "isRowBased", "isActive", "createdAt", "updatedAt") VALUES
  ('Tempat-Tempat Umum (TTU)', 'ttu', 'Pengawasan sanitasi fasilitas publik (Sekolah, Pasar, Ibadah, dll).', '🏢', 6, true, true, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET nama = EXCLUDED.nama, deskripsi = EXCLUDED.deskripsi, icon = EXCLUDED.icon, urutan = EXCLUDED.urutan, "isRowBased" = EXCLUDED."isRowBased";

-- ============================================================
-- 3. DYNAMIC PARAMETERS
-- ============================================================

-- TPP Parameters
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Terdaftar', 'terdaftar', 'NUMBER', 1),
  ('Diperiksa', 'diperiksa', 'NUMBER', 2),
  ('Laik Jumlah', 'laikJumlah', 'NUMBER', 3)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'tpp'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- SPAL Parameters
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Jumlah Sarana', 'jumlah', 'NUMBER', 1),
  ('Jumlah KK', 'kk', 'NUMBER', 2),
  ('Jumlah Penduduk', 'pddk', 'NUMBER', 3),
  ('Jumlah Diperiksa', 'diperiksaJumlah', 'NUMBER', 4),
  ('Memenuhi Syarat (MS)', 'diperiksaMs', 'NUMBER', 5),
  ('KK Diperiksa', 'diperiksaKk', 'NUMBER', 6),
  ('Penduduk Diperiksa', 'diperiksaPddk', 'NUMBER', 7)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'spal'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- SAB Parameters (SPAL params + inspeksi risiko)
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Jumlah Sarana', 'jumlah', 'NUMBER', 1),
  ('Jumlah KK', 'kk', 'NUMBER', 2),
  ('Jumlah Penduduk', 'pddk', 'NUMBER', 3),
  ('Jumlah Diperiksa', 'diperiksaJumlah', 'NUMBER', 4),
  ('Memenuhi Syarat (MS)', 'diperiksaMs', 'NUMBER', 5),
  ('KK Diperiksa', 'diperiksaKk', 'NUMBER', 6),
  ('Penduduk Diperiksa', 'diperiksaPddk', 'NUMBER', 7),
  ('Risiko Rendah (R)', 'inspeksiR', 'NUMBER', 8),
  ('Risiko Sedang (S)', 'inspeksiS', 'NUMBER', 9),
  ('Risiko Tinggi (T)', 'inspeksiT', 'NUMBER', 10),
  ('Risiko Amat Tinggi (AT)', 'inspeksiAt', 'NUMBER', 11)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'sab'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- JAMBAN Parameters (same as SPAL)
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Jumlah Sarana', 'jumlah', 'NUMBER', 1),
  ('Jumlah KK', 'kk', 'NUMBER', 2),
  ('Jumlah Penduduk', 'pddk', 'NUMBER', 3),
  ('Jumlah Diperiksa', 'diperiksaJumlah', 'NUMBER', 4),
  ('Memenuhi Syarat (MS)', 'diperiksaMs', 'NUMBER', 5),
  ('KK Diperiksa', 'diperiksaKk', 'NUMBER', 6),
  ('Penduduk Diperiksa', 'diperiksaPddk', 'NUMBER', 7)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'jamban'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- RUMAH Parameters
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Jumlah Rumah Ada', 'jumlahRumahAda', 'NUMBER', 1),
  ('Jumlah Diperiksa', 'jumlahDiperiksa', 'NUMBER', 2),
  ('Ventilasi MS', 'ventilasiMs', 'NUMBER', 3),
  ('Ventilasi TMS', 'ventilasiTms', 'NUMBER', 4),
  ('Penerangan MS', 'peneranganMs', 'NUMBER', 5),
  ('Penerangan TMS', 'peneranganTms', 'NUMBER', 6),
  ('Lantai MS', 'lantaiMs', 'NUMBER', 7),
  ('Lantai TMS', 'lantaiTms', 'NUMBER', 8),
  ('Kepadatan Huni MS', 'kepadatanHuniMs', 'NUMBER', 9),
  ('Kepadatan Huni TMS', 'kepadatanHuniTms', 'NUMBER', 10),
  ('Lubang Asap MS', 'lubangAsapMs', 'NUMBER', 11),
  ('Lubang Asap TMS', 'lubangAsapTms', 'NUMBER', 12),
  ('Jamban MS', 'jambanMs', 'NUMBER', 13),
  ('Jamban TMS', 'jambanTms', 'NUMBER', 14),
  ('Air Bersih MS', 'airBersihMs', 'NUMBER', 15),
  ('Air Bersih TMS', 'airBersihTms', 'NUMBER', 16),
  ('Air Limbah MS', 'airLimbahMs', 'NUMBER', 17),
  ('Air Limbah TMS', 'airLimbahTms', 'NUMBER', 18),
  ('Sampah MS', 'sampahMs', 'NUMBER', 19),
  ('Sampah TMS', 'sampahTms', 'NUMBER', 20),
  ('Kandang MS', 'kandangMs', 'NUMBER', 21),
  ('Kandang TMS', 'kandangTms', 'NUMBER', 22),
  ('Kandang Tidak Ada', 'kandangTidakAda', 'NUMBER', 23),
  ('Hasil MS', 'hasilMs', 'NUMBER', 24),
  ('Hasil TMS', 'hasilTms', 'NUMBER', 25)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'rumah'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- TTU Parameters
INSERT INTO dynamic_parameter ("categoryId", nama, code, type, urutan, "isBaseline", "createdAt", "updatedAt")
SELECT dc.id, p.nama, p.code, p.type, p.urutan, false, NOW(), NOW()
FROM dynamic_category dc
CROSS JOIN (VALUES
  ('Jumlah Total', 'jumlahTotal', 'NUMBER', 1),
  ('Memenuhi Syarat (MS)', 'ms', 'NUMBER', 2),
  ('Tidak Memenuhi Syarat (TMS)', 'tms', 'NUMBER', 3)
) AS p(nama, code, type, urutan)
WHERE dc.code = 'ttu'
ON CONFLICT ("categoryId", code) DO NOTHING;

-- ============================================================
-- 4. DYNAMIC SUB-CATEGORIES
-- ============================================================

-- TPP Sub-categories (from jenis_tpp)
INSERT INTO dynamic_sub_category ("categoryId", nama, urutan, "createdAt", "updatedAt")
SELECT dc.id, jt.nama, jt.urutan, NOW(), NOW()
FROM dynamic_category dc, jenis_tpp jt
WHERE dc.code = 'tpp'
ON CONFLICT ("categoryId", nama) DO NOTHING;

-- SPAL Sub-categories (from jenis_sarana where kategori = 'SPAL')
INSERT INTO dynamic_sub_category ("categoryId", nama, urutan, "createdAt", "updatedAt")
SELECT dc.id, js.nama, js.urutan, NOW(), NOW()
FROM dynamic_category dc, jenis_sarana js
WHERE dc.code = 'spal' AND js.kategori = 'SPAL'
ON CONFLICT ("categoryId", nama) DO NOTHING;

-- SAB Sub-categories (from jenis_sarana where kategori = 'SAB')
INSERT INTO dynamic_sub_category ("categoryId", nama, urutan, "createdAt", "updatedAt")
SELECT dc.id, js.nama, js.urutan, NOW(), NOW()
FROM dynamic_category dc, jenis_sarana js
WHERE dc.code = 'sab' AND js.kategori = 'SAB'
ON CONFLICT ("categoryId", nama) DO NOTHING;

-- JAMBAN Sub-categories (from jenis_sarana where kategori = 'JAMBAN')
INSERT INTO dynamic_sub_category ("categoryId", nama, urutan, "createdAt", "updatedAt")
SELECT dc.id, js.nama, js.urutan, NOW(), NOW()
FROM dynamic_category dc, jenis_sarana js
WHERE dc.code = 'jamban' AND js.kategori = 'JAMBAN'
ON CONFLICT ("categoryId", nama) DO NOTHING;

-- TTU Sub-categories (from jenis_ttu, both PRIORITAS and NON_PRIORITAS)
INSERT INTO dynamic_sub_category ("categoryId", nama, grup, urutan, "createdAt", "updatedAt")
SELECT dc.id, jt.nama, jt.kategori::text, jt.urutan, NOW(), NOW()
FROM dynamic_category dc, jenis_ttu jt
WHERE dc.code = 'ttu'
ON CONFLICT ("categoryId", nama) DO NOTHING;

-- ============================================================
-- 5. COMPLIANCE FORMULAS
-- ============================================================

-- TPP Formula
INSERT INTO dynamic_compliance_formula ("categoryId", "numeratorCode", "denominatorCode", description, "createdAt", "updatedAt")
SELECT dc.id, 'laikJumlah', 'diperiksa', 'Persentase TPP Laik = (Laik Jumlah / Diperiksa) * 100', NOW(), NOW()
FROM dynamic_category dc WHERE dc.code = 'tpp'
ON CONFLICT ("categoryId") DO NOTHING;

-- SPAL Formula
INSERT INTO dynamic_compliance_formula ("categoryId", "numeratorCode", "denominatorCode", description, "createdAt", "updatedAt")
SELECT dc.id, 'diperiksaMs', 'diperiksaJumlah', 'Persentase SPAL Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100', NOW(), NOW()
FROM dynamic_category dc WHERE dc.code = 'spal'
ON CONFLICT ("categoryId") DO NOTHING;

-- SAB Formula
INSERT INTO dynamic_compliance_formula ("categoryId", "numeratorCode", "denominatorCode", description, "createdAt", "updatedAt")
SELECT dc.id, 'diperiksaMs', 'diperiksaJumlah', 'Persentase SAB Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100', NOW(), NOW()
FROM dynamic_category dc WHERE dc.code = 'sab'
ON CONFLICT ("categoryId") DO NOTHING;

-- JAMBAN Formula
INSERT INTO dynamic_compliance_formula ("categoryId", "numeratorCode", "denominatorCode", description, "createdAt", "updatedAt")
SELECT dc.id, 'diperiksaMs', 'diperiksaJumlah', 'Persentase Jamban Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100', NOW(), NOW()
FROM dynamic_category dc WHERE dc.code = 'jamban'
ON CONFLICT ("categoryId") DO NOTHING;

-- RUMAH Formula
INSERT INTO dynamic_compliance_formula ("categoryId", "numeratorCode", "denominatorCode", description, "createdAt", "updatedAt")
SELECT dc.id, 'hasilMs', 'jumlahDiperiksa', 'Persentase Rumah Sehat = (Hasil MS / Jumlah Diperiksa) * 100', NOW(), NOW()
FROM dynamic_category dc WHERE dc.code = 'rumah'
ON CONFLICT ("categoryId") DO NOTHING;

-- ============================================================
-- 6. DEFAULT TARGETS (80% for all categories, current year)
-- ============================================================

INSERT INTO dynamic_target (tahun, "categoryId", "targetPersen", "createdAt", "updatedAt")
SELECT 2025, dc.id, 80.0, NOW(), NOW()
FROM dynamic_category dc
ON CONFLICT (tahun, "categoryId") DO NOTHING;

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT '=== SEED COMPLETE ===' as status;
SELECT 'Puskesmas' as table_name, COUNT(*) as count FROM puskesmas
UNION ALL SELECT 'Jenis TPP', COUNT(*) FROM jenis_tpp
UNION ALL SELECT 'Jenis Sarana', COUNT(*) FROM jenis_sarana
UNION ALL SELECT 'Jenis TTU', COUNT(*) FROM jenis_ttu
UNION ALL SELECT 'Users', COUNT(*) FROM "user"
UNION ALL SELECT 'Dynamic Categories', COUNT(*) FROM dynamic_category
UNION ALL SELECT 'Dynamic Parameters', COUNT(*) FROM dynamic_parameter
UNION ALL SELECT 'Dynamic Sub-categories', COUNT(*) FROM dynamic_sub_category
UNION ALL SELECT 'Compliance Formulas', COUNT(*) FROM dynamic_compliance_formula
UNION ALL SELECT 'Dynamic Targets', COUNT(*) FROM dynamic_target;
