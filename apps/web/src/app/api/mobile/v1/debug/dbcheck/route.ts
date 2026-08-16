import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";

// Diagnostic + recovery: check table/column existence, apply DDL via Prisma runtime
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "seedkesling123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};
  const ddlApplied: string[] = [];
  const ddlError: string[] = [];
  try {
    results.tablesBefore = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rencana_bulanan', 'InspectionResult') ORDER BY tablename`;
    results.columnsBefore = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'InspectionResult' ORDER BY column_name`;
  } catch (err: any) {
    results.checkError = err.message;
  }

  try {
    // DDL recovery via Prisma runtime (entrypoint psql may fail on pooled URL)
    const ddl = [
      `CREATE TABLE IF NOT EXISTS "rencana_bulanan" (
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
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "rencana_bulanan_puskesmasId_sasaranId_bulan_tahun_key" ON "rencana_bulanan"("puskesmasId", "sasaranId", "bulan", "tahun")`,
      `CREATE INDEX IF NOT EXISTS "rencana_bulanan_puskesmasId_bulan_tahun_idx" ON "rencana_bulanan"("puskesmasId", "bulan", "tahun")`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "bulan" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "tahun" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "namaSasaran" TEXT`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "alamatSasaran" TEXT`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "lat" DOUBLE PRECISION`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "lng" DOUBLE PRECISION`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "signatureData" JSONB`,
      `ALTER TABLE "InspectionResult" ADD COLUMN IF NOT EXISTS "fotoPaths" JSONB DEFAULT '[]'`,
    ];
    results.ddlApplied = ddlApplied;
    for (const stmt of ddl) {
      await prisma.$executeRawUnsafe(stmt);
      ddlApplied.push(stmt.slice(0, 50) + "...");
    }
    // FKs (best-effort, ignore if constraint exists)
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_puskesmasId_fkey" FOREIGN KEY ("puskesmasId") REFERENCES "puskesmas"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      );
    } catch {}
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "rencana_bulanan" ADD CONSTRAINT "rencana_bulanan_sasaranId_fkey" FOREIGN KEY ("sasaranId") REFERENCES "Sasaran"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      );
    } catch {}
    results.fksAdded = true;
  } catch (err: any) {
    results.ddlError = err.message;
    results.ddlApplied = ddlApplied;
  }

  try {
    results.tablesAfter = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rencana_bulanan', 'InspectionResult') ORDER BY tablename`;
    results.columnsAfter = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'InspectionResult' ORDER BY column_name`;
  } catch (err: any) {
    results.verifyError = err.message;
  }

  return NextResponse.json(results);
}
