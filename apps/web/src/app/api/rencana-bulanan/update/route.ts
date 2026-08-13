import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

// PUT: update status rencana per sasaran (tandai selesai/dilewati, catatan)
export const PUT = withAuth(async (req: NextRequest) => {
  const user = (req as unknown as { user: { id: number; role: string; puskesmasId: number | null } }).user;
  const body = await req.json().catch(() => ({}));
  const { rencanaId, status, catatan } = body;
  if (!rencanaId) return NextResponse.json({ error: "rencanaId wajib" }, { status: 400 });

  const rencana = await prisma.rencanaBulanan.findUnique({ where: { id: rencanaId } });
  if (!rencana) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  if (user.role === "OPERATOR" && rencana.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const valid = ["TERJADWAL", "SELESAI", "DILEWATI"];
  const updated = await prisma.rencanaBulanan.update({
    where: { id: rencanaId },
    data: {
      ...(valid.includes(status) ? { status } : {}),
      ...(catatan !== undefined ? { catatan } : {}),
    },
  });

  return NextResponse.json({ success: true, rencana: updated });
});
