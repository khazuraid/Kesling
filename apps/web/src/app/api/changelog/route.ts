import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/session";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const tableName = searchParams.get("table") || "";
  const recordId = Number(searchParams.get("recordId")) || 0;

  const where: any = {};
  if (tableName) where.tableName = tableName;
  if (recordId) where.recordId = recordId;

  const logs = await prisma.changelog.findMany({
    where,
    include: { user: { select: { nama: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
});

// FIX: POST sekarang pakai userId dari session, bukan dari request body
// Sebelumnya: client bisa kirim userId sembarang -- bisa inject aktivitas sebagai user lain
export const POST = withAuth(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tableName, recordId, changes } = await req.json();

  if (!tableName || !recordId || !Array.isArray(changes)) {
    return NextResponse.json({ error: "tableName, recordId, dan changes wajib diisi" }, { status: 400 });
  }

  const entries = (changes as { field: string; oldValue: string; newValue: string }[]).map((c) => ({
    tableName,
    recordId: Number(recordId),
    userId: user.id, // FIX: dari session, bukan dari body
    field: c.field,
    oldValue: c.oldValue?.toString() || null,
    newValue: c.newValue?.toString() || null,
  }));

  await prisma.changelog.createMany({ data: entries });
  return NextResponse.json({ success: true });
});
