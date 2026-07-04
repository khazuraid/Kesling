import { prisma } from "@apps-kes/database";
import { hash } from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const GET = withAdmin(async () => {
  const data = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      email: true,
      role: true,
      puskesmasId: true,
      puskesmas: { select: { nama: true } },
    },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(data);
});

export const POST = withAdmin(async (req: NextRequest) => {
  const user = (req as any).user;
  const body = await req.json();

  // FIX: Add validation before creating user
  if (!body.nama || !body.email || !body.password || !body.role) {
    return NextResponse.json({ error: "nama, email, password, dan role wajib diisi" }, { status: 400 });
  }

  if (!["ADMIN", "OPERATOR"].includes(body.role)) {
    return NextResponse.json({ error: "Role harus ADMIN atau OPERATOR" }, { status: 400 });
  }

  if (body.role === "OPERATOR" && !body.puskesmasId) {
    return NextResponse.json({ error: "Operator harus memiliki puskesmasId" }, { status: 400 });
  }

  // FIX: Check duplicate email before insert
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
  }

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

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      tableName: "user",
      recordId: data.id,
      newData: { nama: data.nama, email: data.email, role: data.role },
    },
  });

  return NextResponse.json({ id: data.id, nama: data.nama, email: data.email, role: data.role }, { status: 201 });
});
