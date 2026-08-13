-- CreateTable
CREATE TABLE "rencana_bulanan" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rencana_bulanan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rencana_bulanan_puskesmasId_sasaranId_bulan_tahun_key" ON "rencana_bulanan"("puskesmasId", "sasaranId", "bulan", "tahun");

-- CreateIndex
CREATE INDEX "rencana_bulanan_puskesmasId_bulan_tahun_idx" ON "rencana_bulanan"("puskesmasId", "bulan", "tahun");

-- AddForeignKey
ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "sasaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
