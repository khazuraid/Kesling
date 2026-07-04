-- CreateTable
CREATE TABLE "dynamic_category" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "deskripsi" TEXT,
    "icon" TEXT NOT NULL DEFAULT '📋',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "isRowBased" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_sub_category" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_sub_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_parameter" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NUMBER',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_parameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_compliance_formula" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "numeratorCode" TEXT NOT NULL,
    "denominatorCode" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_compliance_formula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_laporan" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_laporan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_laporan_value" (
    "id" SERIAL NOT NULL,
    "laporanId" INTEGER NOT NULL,
    "parameterId" INTEGER NOT NULL,
    "subCategoryId" INTEGER,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_laporan_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_target" (
    "id" SERIAL NOT NULL,
    "tahun" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "puskesmasId" INTEGER,
    "targetPersen" DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dynamic_target_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_category_nama_key" ON "dynamic_category"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_category_code_key" ON "dynamic_category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_sub_category_categoryId_nama_key" ON "dynamic_sub_category"("categoryId", "nama");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_parameter_categoryId_code_key" ON "dynamic_parameter"("categoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_compliance_formula_categoryId_key" ON "dynamic_compliance_formula"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_laporan_puskesmasId_categoryId_bulan_tahun_key" ON "dynamic_laporan"("puskesmasId", "categoryId", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_laporan_value_laporanId_parameterId_subCategoryId_key" ON "dynamic_laporan_value"("laporanId", "parameterId", "subCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "dynamic_target_tahun_categoryId_puskesmasId_key" ON "dynamic_target"("tahun", "categoryId", "puskesmasId");

-- AddForeignKey
ALTER TABLE "dynamic_sub_category" ADD CONSTRAINT "dynamic_sub_category_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "dynamic_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_parameter" ADD CONSTRAINT "dynamic_parameter_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "dynamic_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_compliance_formula" ADD CONSTRAINT "dynamic_compliance_formula_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "dynamic_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_laporan" ADD CONSTRAINT "dynamic_laporan_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_laporan" ADD CONSTRAINT "dynamic_laporan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "dynamic_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_laporan_value" ADD CONSTRAINT "dynamic_laporan_value_laporanId_fkey" FOREIGN KEY ("laporanId") REFERENCES "dynamic_laporan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_laporan_value" ADD CONSTRAINT "dynamic_laporan_value_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "dynamic_parameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_laporan_value" ADD CONSTRAINT "dynamic_laporan_value_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "dynamic_sub_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_target" ADD CONSTRAINT "dynamic_target_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "dynamic_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
