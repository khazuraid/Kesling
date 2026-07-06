import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

// GET /api/master/jenis?type=tpp|sarana|ttu
// Returns list of jenis for dropdowns in form builder
export const GET = withAuth(async (req: NextRequest) => {
  const type = req.nextUrl.searchParams.get("type") || "all";

  const [tpp, sarana, ttu] = await Promise.all([
    type === "all" || type === "tpp"
      ? prisma.jenisTpp.findMany({ select: { id: true, nama: true, urutan: true }, orderBy: { urutan: "asc" } })
      : Promise.resolve([]),
    type === "all" || type === "sarana"
      ? prisma.jenisSarana.findMany({
          select: { id: true, nama: true, kategori: true, urutan: true },
          orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
        })
      : Promise.resolve([]),
    type === "all" || type === "ttu"
      ? prisma.jenisTtu.findMany({
          select: { id: true, nama: true, kategori: true, urutan: true },
          orderBy: [{ kategori: "asc" }, { urutan: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({ tpp, sarana, ttu });
});
