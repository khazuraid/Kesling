import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kategori = searchParams.get("kategori");
  const where = kategori ? { kategori: kategori as any } : {};
  const data = await prisma.jenisSarana.findMany({ where, orderBy: { urutan: "asc" } });
  return NextResponse.json(data);
}

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const count = await prisma.jenisSarana.count({ where: { kategori: body.kategori } });
  const data = await prisma.jenisSarana.create({
    data: { nama: body.nama, kategori: body.kategori, urutan: count + 1 },
  });
  return NextResponse.json(data, { status: 201 });
});
