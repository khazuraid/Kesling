import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) {
    return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  }

  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    orderBy: { urutan: "asc" },
    include: {
      subCategories: {
        orderBy: { urutan: "asc" },
      },
    },
  });

  return NextResponse.json(categories);
}
