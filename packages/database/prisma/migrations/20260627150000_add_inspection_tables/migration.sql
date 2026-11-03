-- Add InspectionTemplate and related tables (if not created by prisma schema)

CREATE TABLE IF NOT EXISTS "InspectionTemplate" (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "puskesmasId" INTEGER,
  "subCategoryId" INTEGER,
  config JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InspectionField" (
  id SERIAL PRIMARY KEY,
  "templateId" INTEGER NOT NULL REFERENCES "InspectionTemplate"(id) ON DELETE CASCADE,
  pertanyaan TEXT NOT NULL,
  tipe TEXT NOT NULL,
  options TEXT,
  "isRequired" BOOLEAN DEFAULT true,
  urutan INTEGER DEFAULT 0,
  grup TEXT,
  config JSONB
);

CREATE TABLE IF NOT EXISTS "InspectionResult" (
  id SERIAL PRIMARY KEY,
  "templateId" INTEGER NOT NULL REFERENCES "InspectionTemplate"(id) ON DELETE CASCADE,
  "puskesmasId" INTEGER NOT NULL,
  "userId" INTEGER,
  "sasaranId" INTEGER,
  "namaSasaran" TEXT,
  "alamatSasaran" TEXT,
  "lat" DOUBLE PRECISION,
  "lng" DOUBLE PRECISION,
  status TEXT DEFAULT 'DRAFT',
  catatan TEXT,
  "bulan" INTEGER NOT NULL DEFAULT 0,
  "tahun" INTEGER NOT NULL DEFAULT 0,
  tanggal TIMESTAMP(3),
  skor DECIMAL,
  "signatureData" JSONB,
  "fotoPaths" JSONB DEFAULT '[]',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InspectionResultValue" (
  id SERIAL PRIMARY KEY,
  "resultId" INTEGER NOT NULL REFERENCES "InspectionResult"(id) ON DELETE CASCADE,
  "fieldId" INTEGER NOT NULL REFERENCES "InspectionField"(id) ON DELETE CASCADE,
  "valueString" TEXT,
  "valueNumber" DOUBLE PRECISION,
  "valueJson" JSONB,
  nilai TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Ensure all expected columns exist on InspectionTemplate
ALTER TABLE "InspectionTemplate" ADD COLUMN IF NOT EXISTS "config" JSONB;
ALTER TABLE "InspectionTemplate" ADD COLUMN IF NOT EXISTS "puskesmasId" INTEGER;
ALTER TABLE "InspectionTemplate" ADD COLUMN IF NOT EXISTS "subCategoryId" INTEGER;

-- Ensure all expected columns exist on InspectionResult
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "userId" INTEGER;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "sasaranId" INTEGER;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "namaSasaran" TEXT;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "alamatSasaran" TEXT;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "bulan" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "tahun" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "tanggal" TIMESTAMP(3);
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "signatureData" JSONB;
ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "fotoPaths" JSONB DEFAULT '[]';

-- Ensure all expected columns exist on InspectionResultValue
ALTER TABLE "InspectionResultValue" ADD COLUMN IF NOT EXISTS "valueString" TEXT;
ALTER TABLE "InspectionResultValue" ADD COLUMN IF NOT EXISTS "valueNumber" DOUBLE PRECISION;
ALTER TABLE "InspectionResultValue" ADD COLUMN IF NOT EXISTS "valueJson" JSONB;
