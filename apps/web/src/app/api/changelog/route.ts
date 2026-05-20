import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const tableName = searchParams.get("table") || "";
  const recordId = Number(searchParams.get("recordId")) || 0;

  const where: any = {};
  if (tableName) where.tableName = tableName;
  if (recordId) where.recordId = recordId;

  const logs = await (prisma as any).changelog.findMany({
    where,
    include: { user: { select: { nama: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
});

export const POST = withAuth(async (req: NextRequest) => {
  const { tableName, recordId, userId, changes } = await req.json();

  const entries = (changes as { field: string; oldValue: string; newValue: string }[]).map((c) => ({
    tableName,
    recordId,
    userId,
    field: c.field,
    oldValue: c.oldValue?.toString() || null,
    newValue: c.newValue?.toString() || null,
  }));

  await (prisma as any).changelog.createMany({ data: entries });
  return NextResponse.json({ success: true });
});
