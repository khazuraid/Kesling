import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take")) || 50, 100);
    const search = searchParams.get("search")?.trim() || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { user: { nama: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              nama: true,
              username: true,
              role: true,
              puskesmas: { select: { id: true, nama: true } },
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ notifications, total });
  } catch (error) {
    console.error("[Admin Notifications] Error:", error);
    return NextResponse.json({ error: "Gagal memuat notifikasi." }, { status: 500 });
  }
});
