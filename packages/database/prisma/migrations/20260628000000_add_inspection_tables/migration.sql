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
    "dataDinamis" JSONB NOT NULL DEFAULT '{}',
    "isBaseline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sasaran_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "Puskesmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "DynamicSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionField" ADD CONSTRAINT "InspectionField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sasaran" ADD CONSTRAINT "Sasaran_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "DynamicSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "Puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InspectionResult" ADD CONSTRAINT "InspectionResult_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionResultValue" ADD CONSTRAINT "InspectionResultValue_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "InspectionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InspectionResultValue" ADD CONSTRAINT "InspectionResultValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "InspectionField"("id") ON DELETE CASCADE ON UPDATE CASCADE;
