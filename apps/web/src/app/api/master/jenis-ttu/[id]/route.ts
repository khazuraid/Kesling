import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const PUT = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data = await prisma.jenisTtu.update({
    where: { id: Number(id) },
    data: { nama: body.nama, kategori: body.kategori },
  });
  return NextResponse.json(data);
});

export const DELETE = withAdmin(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await prisma.jenisTtu.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
});
