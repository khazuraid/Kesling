import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export async function GET() {
  const data = await prisma.jenisTpp.findMany({ orderBy: { urutan: "asc" } });
  return NextResponse.json(data);
}

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const count = await prisma.jenisTpp.count();
  const data = await prisma.jenisTpp.create({
    data: { nama: body.nama, urutan: count + 1 },
  });
  return NextResponse.json(data, { status: 201 });
});
