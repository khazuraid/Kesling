import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return NextResponse.json({ announcement: null });
    }

    const now = new Date();

    // Cari pengumuman modal popup aktif yang relevan dengan role user
    // dan belum pernah di-dismiss oleh user ini
    const announcement = await prisma.announcement.findFirst({
      where: {
        isActive: true,
        isPopup: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
        targetRole: { in: ["ALL", user.role as any] },
        dismissals: {
          none: {
            userId: user.id,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        imageUrl: true,
        type: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ announcement: announcement || null });
  } catch (error) {
    console.error("[Popup Announcement GET] Error:", error);
    return NextResponse.json({ announcement: null });
  }
});
