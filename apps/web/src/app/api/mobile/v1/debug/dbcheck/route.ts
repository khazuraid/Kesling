import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";

// Diagnostic: check table/column existence in prod DB
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "seedkesling123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('rencana_bulanan', 'InspectionResult') ORDER BY tablename`;
    const columns = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_name = 'InspectionResult' AND column_name IN ('bulan','tahun','tanggal','sasaranId') ORDER BY column_name`;
    return NextResponse.json({ tables, columns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "check failed" }, { status: 500 });
  }
}
