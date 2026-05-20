import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const PUT = withAdmin(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await req.json();
  const data: any = { nama: body.nama, email: body.email, role: body.role, puskesmasId: body.puskesmasId || null };
  if (body.password) data.password = await hash(body.password, 12);
  const user = await prisma.user.update({ where: { id: Number(id) }, data });
  return NextResponse.json({ id: user.id, nama: user.nama, email: user.email });
});

export const DELETE = withAdmin(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  await prisma.user.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
});
