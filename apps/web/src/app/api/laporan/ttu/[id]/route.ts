import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-auth";
import { createAuditLog } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";

export const DELETE = withErrorHandler(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const record = await prisma.laporanTtu.findUnique({ where: { id: Number(id) } });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "OPERATOR" && user.puskesmasId && record.puskesmasId !== user.puskesmasId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.laporanTtu.delete({ where: { id: Number(id) } });
  await createAuditLog({
    userId: user.id,
    action: "DELETE",
    tableName: "laporan_ttu",
    recordId: Number(id),
    oldData: record,
  });
  return NextResponse.json({ ok: true });
});
