import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheGet, cacheInvalidate, cacheSet } from "@/lib/redis";

export async function GET() {
  const cacheKey = "master:puskesmas";
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  const data = await prisma.puskesmas.findMany({ orderBy: { urutan: "asc" } });
  await cacheSet(cacheKey, data, 600);
  return NextResponse.json(data);
}

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const count = await prisma.puskesmas.count();
  const data = await prisma.puskesmas.create({
    data: { nama: body.nama, urutan: count + 1 },
  });
  await cacheInvalidate("master:puskesmas");
  return NextResponse.json(data, { status: 201 });
});
