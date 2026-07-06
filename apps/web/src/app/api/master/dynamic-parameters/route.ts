import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withRoles } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// POST a new parameter
export const POST = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { categoryId, nama, code, type, required, isBaseline, urutan, config } = body;

    if (!categoryId || !nama || !code) {
      return NextResponse.json({ error: "categoryId, nama, and code are required" }, { status: 400 });
    }

    const catId = Number(categoryId);

    // Check if code already exists within this category
    const existing = await prisma.dynamicParameter.findFirst({
      where: {
        categoryId: catId,
        code,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Parameter with code '${code}' already exists in this category` },
        { status: 400 },
      );
    }

    const count = await prisma.dynamicParameter.count({ where: { categoryId: catId } });

    const data = await prisma.dynamicParameter.create({
      data: {
        categoryId: catId,
        nama,
        code,
        type: type || "NUMBER",
        required: required !== undefined ? !!required : true,
        isBaseline: isBaseline !== undefined ? !!isBaseline : false,
        urutan: urutan !== undefined ? Number(urutan) : count + 1,
        config: config || undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "CREATE",
        tableName: "dynamic_parameter",
        recordId: data.id,
        newData: { nama, code, categoryId: catId },
      },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create parameter" }, { status: 500 });
  }
});

// PUT to update a parameter
export const PUT = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  try {
    const body = await req.json();
    const { id, nama, code, type, required, isBaseline, urutan, config } = body;

    if (!id || !nama || !code) {
      return NextResponse.json({ error: "id, nama, and code are required" }, { status: 400 });
    }

    const paramId = Number(id);

    const data = await prisma.dynamicParameter.update({
      where: { id: paramId },
      data: {
        nama,
        code,
        type: type || "NUMBER",
        required: required !== undefined ? !!required : true,
        isBaseline: isBaseline !== undefined ? !!isBaseline : false,
        urutan: urutan !== undefined ? Number(urutan) : undefined,
        config: config !== undefined ? (config === null ? (null as any) : config) : undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId, action: "UPDATE", tableName: "dynamic_parameter", recordId: paramId, newData: { nama, code } },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update parameter" }, { status: 500 });
  }
});

// DELETE a parameter
export const DELETE = withRoles(["ADMIN", "DINKES"], async (req: NextRequest) => {
  const userId = (req as any).user?.id;
  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get("id");
  if (!idStr) {
    return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
  }
  const id = Number(idStr);

  try {
    // Validate: DO NOT delete if parameter has been used to protect historical data
    const usedCount = await prisma.dynamicLaporanValue.count({
      where: { parameterId: id },
    });

    if (usedCount > 0) {
      return NextResponse.json(
        {
          error: `Parameter sudah digunakan di ${usedCount} isian. Tidak dapat dihapus karena akan merusak data historis.`,
        },
        { status: 400 },
      );
    }

    await prisma.dynamicParameter.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: { userId, action: "DELETE", tableName: "dynamic_parameter", recordId: id, newData: undefined },
    });

    await cacheInvalidate("laporan:*");
    await cacheInvalidate("master:*");

    return NextResponse.json({ success: true, message: "Parameter deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete parameter" }, { status: 500 });
  }
});
