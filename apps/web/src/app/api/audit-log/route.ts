import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getPaginationParams, paginatedResponse } from "@/lib/pagination";

export const GET = withAuth(async (req: NextRequest) => {
  const { page, limit, skip } = getPaginationParams(req.nextUrl.searchParams);

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { nama: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  return NextResponse.json(paginatedResponse(data, total, page, limit));
});
