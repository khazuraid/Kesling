-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "StatusLaporan" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');

-- CreateEnum
CREATE TYPE "KategoriSarana" AS ENUM ('SPAL', 'SAB', 'JAMBAN');

-- CreateEnum
CREATE TYPE "KategoriTtu" AS ENUM ('PRIORITAS', 'NON_PRIORITAS');

-- CreateEnum
CREATE TYPE "Action" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "puskesmasId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puskesmas" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "puskesmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_tpp" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_tpp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_sarana" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "KategoriSarana" NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_sarana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jenis_ttu" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" "KategoriTtu" NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jenis_ttu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_tpp" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenisTppId" INTEGER NOT NULL,
    "terdaftar" INTEGER NOT NULL DEFAULT 0,
    "diperiksa" INTEGER NOT NULL DEFAULT 0,
    "laikJumlah" INTEGER NOT NULL DEFAULT 0,
    "laikPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_tpp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_spal" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenisSaranaId" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "kk" INTEGER NOT NULL DEFAULT 0,
    "pddk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaJumlah" INTEGER NOT NULL DEFAULT 0,
    "diperiksaMs" INTEGER NOT NULL DEFAULT 0,
    "diperiksaKk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaPddk" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_spal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_sab" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenisSaranaId" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "kk" INTEGER NOT NULL DEFAULT 0,
    "pddk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaJumlah" INTEGER NOT NULL DEFAULT 0,
    "diperiksaMs" INTEGER NOT NULL DEFAULT 0,
    "diperiksaKk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaPddk" INTEGER NOT NULL DEFAULT 0,
    "inspeksiR" INTEGER NOT NULL DEFAULT 0,
    "inspeksiS" INTEGER NOT NULL DEFAULT 0,
    "inspeksiT" INTEGER NOT NULL DEFAULT 0,
    "inspeksiAt" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_sab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_rumah" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlahRumahAda" INTEGER NOT NULL DEFAULT 0,
    "jumlahDiperiksa" INTEGER NOT NULL DEFAULT 0,
    "ventilasiMs" INTEGER NOT NULL DEFAULT 0,
    "ventilasiTms" INTEGER NOT NULL DEFAULT 0,
    "peneranganMs" INTEGER NOT NULL DEFAULT 0,
    "peneranganTms" INTEGER NOT NULL DEFAULT 0,
    "lantaiMs" INTEGER NOT NULL DEFAULT 0,
    "lantaiTms" INTEGER NOT NULL DEFAULT 0,
    "kepadatanHuniMs" INTEGER NOT NULL DEFAULT 0,
    "kepadatanHuniTms" INTEGER NOT NULL DEFAULT 0,
    "lubangAsapMs" INTEGER NOT NULL DEFAULT 0,
    "lubangAsapTms" INTEGER NOT NULL DEFAULT 0,
    "jambanMs" INTEGER NOT NULL DEFAULT 0,
    "jambanTms" INTEGER NOT NULL DEFAULT 0,
    "airBersihMs" INTEGER NOT NULL DEFAULT 0,
    "airBersihTms" INTEGER NOT NULL DEFAULT 0,
    "airLimbahMs" INTEGER NOT NULL DEFAULT 0,
    "airLimbahTms" INTEGER NOT NULL DEFAULT 0,
    "sampahMs" INTEGER NOT NULL DEFAULT 0,
    "sampahTms" INTEGER NOT NULL DEFAULT 0,
    "kandangMs" INTEGER NOT NULL DEFAULT 0,
    "kandangTms" INTEGER NOT NULL DEFAULT 0,
    "kandangTidakAda" INTEGER NOT NULL DEFAULT 0,
    "hasilMs" INTEGER NOT NULL DEFAULT 0,
    "hasilTms" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_rumah_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_jamban" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenisSaranaId" INTEGER NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "kk" INTEGER NOT NULL DEFAULT 0,
    "pddk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaJumlah" INTEGER NOT NULL DEFAULT 0,
    "diperiksaMs" INTEGER NOT NULL DEFAULT 0,
    "diperiksaKk" INTEGER NOT NULL DEFAULT 0,
    "diperiksaPddk" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_jamban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laporan_ttu" (
    "id" SERIAL NOT NULL,
    "puskesmasId" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenisTtuId" INTEGER NOT NULL,
    "jumlahTotal" INTEGER NOT NULL DEFAULT 0,
    "ms" INTEGER NOT NULL DEFAULT 0,
    "tms" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusLaporan" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laporan_ttu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" "Action" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target" (
    "id" SERIAL NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jenis" TEXT NOT NULL,
    "puskesmasId" INTEGER,
    "targetPersen" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "changelog" (
    "id" SERIAL NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "changelog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "puskesmas_nama_key" ON "puskesmas"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_tpp_nama_key" ON "jenis_tpp"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_sarana_nama_kategori_key" ON "jenis_sarana"("nama", "kategori");

-- CreateIndex
CREATE UNIQUE INDEX "jenis_ttu_nama_kategori_key" ON "jenis_ttu"("nama", "kategori");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_tpp_puskesmasId_bulan_tahun_jenisTppId_key" ON "laporan_tpp"("puskesmasId", "bulan", "tahun", "jenisTppId");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_spal_puskesmasId_bulan_tahun_jenisSaranaId_key" ON "laporan_spal"("puskesmasId", "bulan", "tahun", "jenisSaranaId");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_sab_puskesmasId_bulan_tahun_jenisSaranaId_key" ON "laporan_sab"("puskesmasId", "bulan", "tahun", "jenisSaranaId");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_rumah_puskesmasId_bulan_tahun_key" ON "laporan_rumah"("puskesmasId", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_jamban_puskesmasId_bulan_tahun_jenisSaranaId_key" ON "laporan_jamban"("puskesmasId", "bulan", "tahun", "jenisSaranaId");

-- CreateIndex
CREATE UNIQUE INDEX "laporan_ttu_puskesmasId_bulan_tahun_jenisTtuId_key" ON "laporan_ttu"("puskesmasId", "bulan", "tahun", "jenisTtuId");

-- CreateIndex
CREATE INDEX "audit_log_userId_createdAt_idx" ON "audit_log"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_tableName_recordId_idx" ON "audit_log"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "notification_userId_isRead_createdAt_idx" ON "notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "target_tahun_jenis_puskesmasId_key" ON "target"("tahun", "jenis", "puskesmasId");

-- CreateIndex
CREATE INDEX "changelog_tableName_recordId_idx" ON "changelog"("tableName", "recordId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_tpp" ADD CONSTRAINT "laporan_tpp_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_tpp" ADD CONSTRAINT "laporan_tpp_jenisTppId_fkey" FOREIGN KEY ("jenisTppId") REFERENCES "jenis_tpp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_spal" ADD CONSTRAINT "laporan_spal_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_spal" ADD CONSTRAINT "laporan_spal_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES "jenis_sarana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_sab" ADD CONSTRAINT "laporan_sab_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_sab" ADD CONSTRAINT "laporan_sab_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES "jenis_sarana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_rumah" ADD CONSTRAINT "laporan_rumah_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_jamban" ADD CONSTRAINT "laporan_jamban_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_jamban" ADD CONSTRAINT "laporan_jamban_jenisSaranaId_fkey" FOREIGN KEY ("jenisSaranaId") REFERENCES "jenis_sarana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_ttu" ADD CONSTRAINT "laporan_ttu_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laporan_ttu" ADD CONSTRAINT "laporan_ttu_jenisTtuId_fkey" FOREIGN KEY ("jenisTtuId") REFERENCES "jenis_ttu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target" ADD CONSTRAINT "target_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changelog" ADD CONSTRAINT "changelog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

