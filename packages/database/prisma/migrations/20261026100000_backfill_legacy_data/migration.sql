-- Bereskan data lama hasil dua perubahan skema sebelumnya.
--
-- 1. Nilai foto tersimpan sebagai URL absolut ke domain sendiri atau path
--    tanpa garis miring depan. Keduanya dijawab HTTP 400 kalau diteruskan
--    apa adanya sebagai src ke optimizer gambar.
-- 2. Identitas sarana (pengelola, alamat) hanya tersimpan sebagai jawaban
--    field berkode grup '__META__' di inspection_result_value, bukan di kolom
--    Sasaran — akibatnya riwayat pemeriksaan lama tampil kosong.
--
-- Keduanya idempoten dan tidak pernah menimpa data yang sudah benar.

-- 1a. InspectionResultValue: buang origin domain sendiri + pastikan '/' di depan.
WITH fixed AS (
  SELECT
    "id",
    regexp_replace(
      regexp_replace(
        regexp_replace(btrim("valueString"), '^https?://(www\.)?kesling\.biz\.id/', '/'),
        '^/*public/', '/'
      ),
      '^([^/])', '/\1'
    ) AS next
  FROM "InspectionResultValue"
  WHERE "valueString" LIKE '%uploads%'
    AND "valueString" NOT LIKE 'data:%'
)
UPDATE "InspectionResultValue" v
SET "valueString" = fixed.next
FROM fixed
WHERE v."id" = fixed."id" AND v."valueString" <> fixed.next;

-- 1b. InspectionResult.fotoPaths: JSON array, elemen yang tidak berubah dibiarkan.
UPDATE "InspectionResult" r
SET "fotoPaths" = fixed.next
FROM (
  SELECT
    "id",
    to_jsonb(
      array(
        SELECT regexp_replace(
          regexp_replace(
            regexp_replace(btrim(elem), '^https?://(www\.)?kesling\.biz\.id/', '/'),
            '^/*public/', '/'
          ),
          '^([^/])', '/\1'
        )
        FROM jsonb_array_elements_text("fotoPaths") AS elem
      )
    ) AS next
  FROM "InspectionResult"
  WHERE jsonb_typeof("fotoPaths") = 'array'
    AND "fotoPaths"::text LIKE '%uploads%'
) AS fixed
WHERE r."id" = fixed."id" AND r."fotoPaths" <> fixed.next;

-- 2. Sasaran: lengkapi kolom kosong dari jawaban kuesioner '__META__'.
WITH meta AS (
  SELECT
    r."sasaranId" AS sasaran_id,
    max(CASE WHEN lower(f."pertanyaan") LIKE '%alamat%'
              OR lower(f."pertanyaan") LIKE '%lokasi%'
             THEN nullif(btrim(v."valueString"), '') END) AS alamat,
    max(CASE WHEN lower(f."pertanyaan") LIKE '%pengelola%'
              OR lower(f."pertanyaan") LIKE '%pemilik%'
              OR lower(f."pertanyaan") LIKE '%penanggung jawab%'
             THEN nullif(btrim(v."valueString"), '') END) AS pemilik,
    max(CASE WHEN lower(f."pertanyaan") LIKE '%kontak%'
              OR lower(f."pertanyaan") LIKE '%telepon%'
              OR lower(f."pertanyaan") LIKE '%telp%'
              OR lower(f."pertanyaan") LIKE '%hp%'
             THEN nullif(btrim(v."valueString"), '') END) AS kontak
  FROM "InspectionResult" r
  JOIN "InspectionResultValue" v ON v."resultId" = r."id"
  JOIN "InspectionField" f ON f."id" = v."fieldId"
  WHERE r."sasaranId" IS NOT NULL
    AND f."grup" = '__META__'
    AND v."valueString" IS NOT NULL
  GROUP BY r."sasaranId"
)
UPDATE "Sasaran" s
SET
  "alamat"    = COALESCE(NULLIF(btrim(s."alamat"), ''),  NULLIF(btrim(meta.alamat), '')),
  "pemilik"   = COALESCE(NULLIF(btrim(s."pemilik"), ''), NULLIF(btrim(meta.pemilik), '')),
  "kontak"    = COALESCE(NULLIF(btrim(s."kontak"), ''),  NULLIF(btrim(meta.kontak), '')),
  "updatedAt" = NOW()
FROM meta
WHERE s."id" = meta.sasaran_id
  AND (
    (NULLIF(btrim(s."alamat"), '')  IS NULL AND NULLIF(btrim(meta.alamat), '')  IS NOT NULL)
    OR (NULLIF(btrim(s."pemilik"), '') IS NULL AND NULLIF(btrim(meta.pemilik), '') IS NOT NULL)
    OR (NULLIF(btrim(s."kontak"), '')  IS NULL AND NULLIF(btrim(meta.kontak), '')  IS NOT NULL)
  );
