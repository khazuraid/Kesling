-- CreateTable: InspectionTemplate
CREATE TABLE IF NOT EXISTS "InspectionTemplate" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "puskesmasId" INTEGER,
    "subCategoryId" INTEGER,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InspectionField
CREATE TABLE IF NOT EXISTS "InspectionField" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "pertanyaan" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "options" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "grup" TEXT,
    "config" JSONB,

    CONSTRAINT "InspectionField_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InspectionResult
CREATE TABLE IF NOT EXISTS "InspectionResult" (
    "id" SERIAL NOT NULL,
    "templateId" INTEGER NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "sasaranId" INTEGER,
    "namaSasaran" TEXT,
    "alamatSasaran" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "bulan" INTEGER NOT NULL DEFAULT 0,
    "tahun" INTEGER NOT NULL DEFAULT 0,
    "tanggal" TIMESTAMP(3),
    "signatureData" JSONB,
    "fotoPaths" JSONB DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable: InspectionResultValue
CREATE TABLE IF NOT EXISTS "InspectionResultValue" (
    "id" SERIAL NOT NULL,
    "resultId" INTEGER NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueJson" JSONB,

    CONSTRAINT "InspectionResultValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Sasaran
CREATE TABLE IF NOT EXISTS "Sasaran" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "pemilik" TEXT,
    "kontak" TEXT,
    "puskesmasId" INTEGER NOT NULL,
    "subCategoryId" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "dataDinamis" JSONB,

    CONSTRAINT "Sasaran_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InspectionTemplate_puskesmasId_idx" ON "InspectionTemplate"("puskesmasId");
CREATE INDEX IF NOT EXISTS "InspectionTemplate_subCategoryId_idx" ON "InspectionTemplate"("subCategoryId");
CREATE INDEX IF NOT EXISTS "InspectionField_templateId_idx" ON "InspectionField"("templateId");
CREATE INDEX IF NOT EXISTS "InspectionResult_templateId_idx" ON "InspectionResult"("templateId");
CREATE INDEX IF NOT EXISTS "InspectionResult_puskesmasId_idx" ON "InspectionResult"("puskesmasId");
CREATE INDEX IF NOT EXISTS "InspectionResult_userId_idx" ON "InspectionResult"("userId");
CREATE INDEX IF NOT EXISTS "InspectionResult_sasaranId_idx" ON "InspectionResult"("sasaranId");
CREATE INDEX IF NOT EXISTS "InspectionResultValue_resultId_idx" ON "InspectionResultValue"("resultId");
CREATE INDEX IF NOT EXISTS "InspectionResultValue_fieldId_idx" ON "InspectionResultValue"("fieldId");
CREATE INDEX IF NOT EXISTS "Sasaran_puskesmasId_idx" ON "Sasaran"("puskesmasId");
CREATE INDEX IF NOT EXISTS "Sasaran_subCategoryId_idx" ON "Sasaran"("subCategoryId");

-- Ensure columns exist before creating foreign keys
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

-- AddForeignKey
ALTER TABLE "InspectionTemplate" DROP CONSTRAINT IF EXISTS "InspectionTemplate_puskesmasId_fkey";
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InspectionTemplate" DROP CONSTRAINT IF EXISTS "InspectionTemplate_subCategoryId_fkey";
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "dynamic_sub_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InspectionField" DROP CONSTRAINT IF EXISTS "InspectionField_templateId_fkey";
ALTER TABLE "InspectionField" ADD CONSTRAINT "InspectionField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InspectionResult" DROP CONSTRAINT IF EXISTS "InspectionResult_templateId_fkey";
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionResult" DROP CONSTRAINT IF EXISTS "InspectionResult_puskesmasId_fkey";
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionResult" DROP CONSTRAINT IF EXISTS "InspectionResult_userId_fkey";
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InspectionResult" DROP CONSTRAINT IF EXISTS "InspectionResult_sasaranId_fkey";
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InspectionResultValue" DROP CONSTRAINT IF EXISTS "InspectionResultValue_resultId_fkey";
ALTER TABLE "InspectionResultValue" ADD CONSTRAINT "InspectionResultValue_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "InspectionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InspectionResultValue" DROP CONSTRAINT IF EXISTS "InspectionResultValue_fieldId_fkey";
ALTER TABLE "InspectionResultValue" ADD CONSTRAINT "InspectionResultValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "InspectionField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Sasaran" DROP CONSTRAINT IF EXISTS "Sasaran_puskesmasId_fkey";
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Sasaran" DROP CONSTRAINT IF EXISTS "Sasaran_subCategoryId_fkey";
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "dynamic_sub_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
