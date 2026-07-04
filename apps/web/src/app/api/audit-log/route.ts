import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export const GET = withAuth(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const { page, limit, skip } = getPaginationParams(sp);

  const search = sp.get("search") || "";
  const action = sp.get("action") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";
  const userId = sp.get("userId") || "";

  const where: any = {};

  if (search) {
    where.OR = [
      { user: { nama: { contains: search, mode: "insensitive" } } },
      { tableName: { contains: search, mode: "insensitive" } },
      { action: { contains: search, mode: "insensitive" } },
    ];
  }

  if (action && action !== "all") {
    where.action = action;
  }

  if (userId) {
    where.userId = Number(userId);
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, nama: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json(paginatedResponse(data, total, page, limit));
});
