import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.dynamicCategory.findMany({
    where: { isActive: true },
    include: {
      subCategories: { orderBy: { urutan: "asc" } },
      parameters: { orderBy: { urutan: "asc" } },
      formula: true,
    },
    orderBy: { urutan: "asc" },
  });
  return NextResponse.json(categories);
}
