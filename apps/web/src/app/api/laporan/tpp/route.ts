import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { laporanTppSchema, validateBody } from "@/lib/validations";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

  const where: any = { bulan, tahun };
  if (user.role === "OPERATOR" && user.puskesmasId) {
    where.puskesmasId = user.puskesmasId;
  }

  const data = await prisma.laporanTpp.findMany({
    where,
    include: { puskesmas: true, jenisTpp: true },
    orderBy: [{ puskesmas: { urutan: "asc" } }, { jenisTpp: { urutan: "asc" } }],
    take: 500,
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json();
  const parsed = validateBody(laporanTppSchema, raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = parsed.data;

  if (user.role === "OPERATOR" && user.puskesmasId && body.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Forbidden: bukan puskesmas Anda" }, { status: 403 });
  }
  // body: { puskesmasId, bulan, tahun, items: [{ jenisTppId, terdaftar, diperiksa, laikJumlah }] }
  try {
    const results = await prisma.$transaction(
      body.items.map((item) => {
        const laikPersen = item.diperiksa > 0 ? (item.laikJumlah / item.diperiksa) * 100 : 0;
        return prisma.laporanTpp.upsert({
          where: {
            puskesmasId_bulan_tahun_jenisTppId: {
              puskesmasId: body.puskesmasId,
              bulan: body.bulan,
              tahun: body.tahun,
              jenisTppId: item.jenisTppId,
            },
          },
          update: { terdaftar: item.terdaftar, diperiksa: item.diperiksa, laikJumlah: item.laikJumlah, laikPersen },
          create: {
            puskesmasId: body.puskesmasId,
            bulan: body.bulan,
            tahun: body.tahun,
            jenisTppId: item.jenisTppId,
            terdaftar: item.terdaftar,
            diperiksa: item.diperiksa,
            laikJumlah: item.laikJumlah,
            laikPersen,
          },
        });
      }),
    );
    for (const r of results) {
      await createAuditLog({ userId: user.id, action: "CREATE", tableName: "laporan_tpp", recordId: r.id, newData: r });
    }
    return NextResponse.json(results, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Gagal menyimpan data" }, { status: 500 });
  }
}
