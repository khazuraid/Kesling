import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// POST or PUT to upsert compliance formula for a category
export const POST = withAdmin(async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { categoryId, numeratorCode, denominatorCode, description } = body;

    if (!categoryId || !numeratorCode || !denominatorCode) {
      return NextResponse.json(
        { error: "categoryId, numeratorCode, and denominatorCode are required" },
        { status: 400 },
      );
    }

    const catId = Number(categoryId);

    // Upsert the formula
    const data = await prisma.dynamicComplianceFormula.upsert({
      where: { categoryId: catId },
      update: {
        numeratorCode,
        denominatorCode,
        description: description || `(${numeratorCode} / ${denominatorCode}) * 100`,
      },
      create: {
        categoryId: catId,
        numeratorCode,
        denominatorCode,
        description: description || `(${numeratorCode} / ${denominatorCode}) * 100`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        tableName: "dynamic_formula",
        recordId: data.categoryId,
        newData: { numeratorCode, denominatorCode },
      },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to set compliance formula" }, { status: 500 });
  }
});
