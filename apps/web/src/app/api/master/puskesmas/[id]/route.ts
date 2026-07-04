import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

export const PUT = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;
  const body = await req.json();

  const old = await prisma.puskesmas.findUnique({ where: { id: Number(id) } });
  const data = await prisma.puskesmas.update({
    where: { id: Number(id) },
    data: { nama: body.nama },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "UPDATE",
      tableName: "puskesmas",
      recordId: data.id,
      oldData: { nama: old?.nama },
      newData: { nama: data.nama },
    },
  });

  await cacheInvalidate("master:puskesmas");
  return NextResponse.json(data);
});

export const DELETE = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;

  const old = await prisma.puskesmas.findUnique({ where: { id: Number(id) } });
  await prisma.puskesmas.delete({ where: { id: Number(id) } });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "DELETE",
      tableName: "puskesmas",
      recordId: Number(id),
      oldData: { nama: old?.nama },
      newData: undefined,
    },
  });

  await cacheInvalidate("master:puskesmas");
  return NextResponse.json({ ok: true });
});
