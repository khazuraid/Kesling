import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// PUT to update a category
export const PUT = withRoles(
  ["ADMIN", "DINKES"],
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = (req as any).user?.id;
    try {
      const { id } = await params;
      const body = await req.json();
      const { nama, code, deskripsi, icon, urutan, isActive, isRowBased, formula } = body;

      const categoryId = Number(id);
      if (Number.isNaN(categoryId)) {
        return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
      }

      const data = await prisma.dynamicCategory.update({
        where: { id: categoryId },
        data: {
          nama,
          code,
          deskripsi,
          icon,
          urutan: urutan !== undefined ? Number(urutan) : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
          isRowBased: isRowBased !== undefined ? !!isRowBased : undefined,
          ...(formula
            ? {
                formula: {
                  upsert: {
                    create: {
                      numeratorCode: formula.numeratorCode,
                      denominatorCode: formula.denominatorCode,
                      description: formula.description || "",
                    },
                    update: {
                      numeratorCode: formula.numeratorCode,
                      denominatorCode: formula.denominatorCode,
                      description: formula.description || "",
                    },
                  },
                },
              }
            : {}),
        },
      });

      await prisma.auditLog.create({
        data: { userId, action: "UPDATE", tableName: "dynamic_category", recordId: categoryId, newData: { nama } },
      });

      await cacheInvalidate("laporan:*");
      await cacheInvalidate("master:*");

      return NextResponse.json(data);
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Failed to update category" }, { status: 500 });
    }
  },
);

// DELETE a category (and cascade manually to be extremely robust against DB foreign keys)
export const DELETE = withRoles(
  ["ADMIN", "DINKES"],
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const userId = (req as any).user?.id;
    try {
      const { id } = await params;
      const categoryId = Number(id);

      if (Number.isNaN(categoryId)) {
        return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
      }

      // Validate: DO NOT delete if reports exist to protect historical data
      const existingReports = await prisma.dynamicLaporan.count({
        where: { categoryId },
      });

      if (existingReports > 0) {
        return NextResponse.json(
          {
            error: `Terdapat ${existingReports} laporan aktif. Kategori tidak dapat dihapus (harap di-nonaktifkan saja).`,
          },
          { status: 400 },
        );
      }

      const old = await prisma.dynamicCategory.findUnique({ where: { id: categoryId } });

      await prisma.$transaction(async (tx) => {
        // 1. Delete all dynamic target values
        await tx.dynamicTarget.deleteMany({
          where: { categoryId },
        });

        // 2. Delete all compliance formulas
        await tx.dynamicComplianceFormula.deleteMany({
          where: { categoryId },
        });

        // 3. Delete all parameters
        await tx.dynamicParameter.deleteMany({
          where: { categoryId },
        });

        // 4. Delete all subcategories
        await tx.dynamicSubCategory.deleteMany({
          where: { categoryId },
        });

        // 5. Delete the category itself
        await tx.dynamicCategory.delete({
          where: { id: categoryId },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "DELETE",
            tableName: "dynamic_category",
            recordId: categoryId,
            oldData: { nama: old?.nama },
          },
        });
      });

      await cacheInvalidate("laporan:*");
      await cacheInvalidate("master:*");

      return NextResponse.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      return NextResponse.json({ error: error?.message || "Failed to delete category" }, { status: 500 });
    }
  },
);
