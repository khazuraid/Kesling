import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// POST a new subcategory
export const POST = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { categoryId, nama, urutan, grup } = body;

    if (!categoryId || !nama) {
      return NextResponse.json({ error: "categoryId and nama are required" }, { status: 400 });
    }

    const count = await prisma.dynamicSubCategory.count({ where: { categoryId: Number(categoryId) } });

    const data = await prisma.dynamicSubCategory.create({
      data: {
        categoryId: Number(categoryId),
        nama,
        grup: grup || null,
        urutan: urutan !== undefined ? Number(urutan) : count + 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        tableName: "dynamic_sub_category",
        recordId: data.id,
        newData: { nama, categoryId },
      },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create subcategory" }, { status: 500 });
  }
});

// PUT to update a subcategory
export const PUT = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { id, nama, urutan, grup } = body;

    if (!id || !nama) {
      return NextResponse.json({ error: "id and nama are required" }, { status: 400 });
    }

    const data = await prisma.dynamicSubCategory.update({
      where: { id: Number(id) },
      data: {
        nama,
        grup: grup !== undefined ? grup || null : undefined,
        urutan: urutan !== undefined ? Number(urutan) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId, action: "UPDATE", tableName: "dynamic_sub_category", recordId: Number(id), newData: { nama } },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update subcategory" }, { status: 500 });
  }
});

// DELETE a subcategory (with cascade delete for associated values)
export const DELETE = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get("id");
  if (!idStr) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
  }
  const id = Number(idStr);

  try {
    // Validate: DO NOT delete if subcategory has been used to protect historical data
    const usedCount = await prisma.dynamicLaporanValue.count({
      where: { subCategoryId: id },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        {
          error: `Baris sudah digunakan di ${usedCount} isian. Tidak dapat dihapus karena akan merusak data historis.`,
        },
        { status: 400 },
      );
    }

    await prisma.dynamicSubCategory.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: { userId, action: "DELETE", tableName: "dynamic_sub_category", recordId: id, newData: undefined },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json({ success: true, message: "Subcategory deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete subcategory" }, { status: 500 });
  }
});
