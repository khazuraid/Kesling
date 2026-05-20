import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const GET = withAdmin(async () => {
  const data = await prisma.user.findMany({
    select: { id: true, nama: true, email: true, role: true, puskesmasId: true, puskesmas: { select: { nama: true } } },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(data);
});

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json();
  const hashedPassword = await hash(body.password, 12);
  const data = await prisma.user.create({
    data: {
      nama: body.nama,
      email: body.email,
      password: hashedPassword,
      role: body.role,
      puskesmasId: body.puskesmasId || null,
    },
  });
  return NextResponse.json({ id: data.id, nama: data.nama, email: data.email }, { status: 201 });
});
