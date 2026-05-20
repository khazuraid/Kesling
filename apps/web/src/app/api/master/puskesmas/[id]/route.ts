import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

export const PUT = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data = await prisma.puskesmas.update({
    where: { id: Number(id) },
    data: { nama: body.nama },
  });
  await cacheInvalidate("master:puskesmas");
  return NextResponse.json(data);
});

export const DELETE = withAdmin(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await prisma.puskesmas.delete({ where: { id: Number(id) } });
  await cacheInvalidate("master:puskesmas");
  return NextResponse.json({ ok: true });
});
