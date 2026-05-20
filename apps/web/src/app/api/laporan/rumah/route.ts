import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { laporanRumahSchema, validateBody } from "@/lib/validations";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

  const where: any = { bulan, tahun };
  if (user.role === "OPERATOR" && user.puskesmasId) where.puskesmasId = user.puskesmasId;

  const data = await prisma.laporanRumah.findMany({
    where,
    include: { puskesmas: true },
    orderBy: { puskesmas: { urutan: "asc" } },
    take: 500,
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json();
  const parsed = validateBody(laporanRumahSchema, raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.data;

  if (user.role === "OPERATOR" && user.puskesmasId && body.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Forbidden: bukan puskesmas Anda" }, { status: 403 });
  }
  const { puskesmasId, bulan, tahun, ...fields } = body;
  try {
    const result = await prisma.laporanRumah.upsert({
      where: { puskesmasId_bulan_tahun: { puskesmasId, bulan, tahun } },
      update: fields,
      create: { puskesmasId, bulan, tahun, ...fields },
    });
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      tableName: "laporan_rumah",
      recordId: result.id,
      newData: result,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal menyimpan data" }, { status: 500 });
  }
}
