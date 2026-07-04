import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// GET all categories with parameters, subcategories, and formulas
export async function GET() {
  try {
    const data = await prisma.dynamicCategory.findMany({
      orderBy: { urutan: "asc" },
      include: {
        parameters: { orderBy: { urutan: "asc" } },
        subCategories: { orderBy: { urutan: "asc" } },
        formula: true,
      },
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch categories" }, { status: 500 });
  }
}

// POST a new category
export const POST = withAdmin(async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { nama, code, deskripsi, icon, isRowBased } = body;

    if (!nama || !code) {
      return NextResponse.json({ error: "Nama and Code are required" }, { status: 400 });
    }

    // Check if category name or code already exists
    const existing = await prisma.dynamicCategory.findFirst({
      where: {
        OR: [{ nama }, { code }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Category with similar name or code already exists" }, { status: 400 });
    }

    const count = await prisma.dynamicCategory.count();

    const data = await prisma.$transaction(async (tx) => {
      // 1. Create the category
      const category = await tx.dynamicCategory.create({
        data: {
          nama,
          code,
          deskripsi,
          icon: icon || "📋",
          isRowBased: !!isRowBased,
          urutan: count + 1,
        },
      });

      // 2. Initialize default parameters for new categories
      // Standard inputs usually have:
      // TPP/SPAL/SAB: jumlah, kk, pddk, diperiksa, dll.
      // Let's create some basic default parameters to help them get started
      if (isRowBased) {
        // e.g. TPP-style defaults: Diperiksa & Laik
        await tx.dynamicParameter.createMany({
          data: [
            { categoryId: category.id, nama: "Jumlah Terdaftar", code: "terdaftar", type: "NUMBER", urutan: 1 },
            { categoryId: category.id, nama: "Jumlah Diperiksa", code: "diperiksa", type: "NUMBER", urutan: 2 },
            { categoryId: category.id, nama: "Laik Sehat / MS", code: "laik_jumlah", type: "NUMBER", urutan: 3 },
          ],
        });

        // Add a default subcategory
        await tx.dynamicSubCategory.create({
          data: { categoryId: category.id, nama: "Umum / Contoh Subkategori", urutan: 1 },
        });

        // Add default formula
        await tx.dynamicComplianceFormula.create({
          data: {
            categoryId: category.id,
            numeratorCode: "laik_jumlah",
            denominatorCode: "diperiksa",
            description: "(Laik Sehat / Diperiksa) * 100",
          },
        });
      } else {
        // Single Card (e.g. Rumah Sehat style defaults: Diperiksa & Memenuhi Syarat)
        await tx.dynamicParameter.createMany({
          data: [
            { categoryId: category.id, nama: "Total Rumah/Sarana Ada", code: "jumlah_ada", type: "NUMBER", urutan: 1 },
            { categoryId: category.id, nama: "Jumlah Diperiksa", code: "diperiksa", type: "NUMBER", urutan: 2 },
            { categoryId: category.id, nama: "Memenuhi Syarat (MS)", code: "ms", type: "NUMBER", urutan: 3 },
            { categoryId: category.id, nama: "Tidak Memenuhi Syarat (TMS)", code: "tms", type: "NUMBER", urutan: 4 },
          ],
        });

        // Add default formula
        await tx.dynamicComplianceFormula.create({
          data: {
            categoryId: category.id,
            numeratorCode: "ms",
            denominatorCode: "diperiksa",
            description: "(Memenuhi Syarat / Diperiksa) * 100",
          },
        });
      }

      return tx.dynamicCategory.findUnique({
        where: { id: category.id },
        include: {
          parameters: { orderBy: { urutan: "asc" } },
          subCategories: { orderBy: { urutan: "asc" } },
          formula: true,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        tableName: "dynamic_category",
        recordId: data?.id ?? 0,
        newData: { nama, code },
      },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create category" }, { status: 500 });
  }
});
