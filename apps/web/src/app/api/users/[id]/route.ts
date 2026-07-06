import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const PUT = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;
  const body = await req.json();

  const old = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { nama: true, email: true, role: true },
  });
  const data: any = {
    nama: body.nama,
    email: body.email,
    role: body.role,
    puskesmasId: body.puskesmasId || null,
    telegramChatId: body.telegramChatId || null,
  };
  if (body.password) data.password = await hash(body.password, 12);
  const user = await prisma.user.update({ where: { id: Number(id) }, data });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "UPDATE",
      tableName: "user",
      recordId: user.id,
      oldData: { nama: old?.nama, email: old?.email, role: old?.role },
      newData: { nama: user.nama, email: user.email, role: user.role },
    },
  });

  return NextResponse.json({ id: user.id, nama: user.nama, email: user.email });
});

export const DELETE = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const adminUser = (req as any).user;

  const old = await prisma.user.findUnique({
    where: { id: Number(id) },
    select: { nama: true, email: true, role: true },
  });
  await prisma.user.delete({ where: { id: Number(id) } });

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: "DELETE",
      tableName: "user",
      recordId: Number(id),
      oldData: { nama: old?.nama, email: old?.email, role: old?.role },
      newData: undefined,
    },
  });

  return NextResponse.json({ ok: true });
});
