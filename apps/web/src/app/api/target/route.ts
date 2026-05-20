import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const tahun = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const targets = await (prisma as any).target.findMany({ where: { tahun }, include: { puskesmas: true } });
  return NextResponse.json(targets);
}

export const POST = withAdmin(async (req: NextRequest) => {
  const { tahun, jenis, puskesmasId, targetPersen } = await req.json();
  const target = await (prisma as any).target.upsert({
    where: { tahun_jenis_puskesmasId: { tahun, jenis, puskesmasId: puskesmasId || null } },
    update: { targetPersen },
    create: { tahun, jenis, puskesmasId: puskesmasId || null, targetPersen },
  });
  return NextResponse.json(target);
});
