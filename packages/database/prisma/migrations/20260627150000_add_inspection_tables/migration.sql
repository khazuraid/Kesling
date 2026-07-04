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
  tanggal DATE NOT NULL,
  skor DECIMAL,
  status TEXT DEFAULT 'DRAFT',
  catatan TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "InspectionResultValue" (
  id SERIAL PRIMARY KEY,
  "resultId" INTEGER NOT NULL REFERENCES "InspectionResult"(id) ON DELETE CASCADE,
  "fieldId" INTEGER NOT NULL REFERENCES "InspectionField"(id) ON DELETE CASCADE,
  nilai TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Add config column to existing InspectionTemplate if it doesn't exist
ALTER TABLE "InspectionTemplate" ADD COLUMN IF NOT EXISTS "config" JSONB;
