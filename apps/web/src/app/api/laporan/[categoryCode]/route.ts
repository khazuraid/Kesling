import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheInvalidate, cacheSet } from "@/lib/redis";
import { getCurrentUser } from "@/lib/session";

// GET handler to fetch dynamic reports and values
export async function GET(req: NextRequest, { params }: { params: Promise<{ categoryCode: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { categoryCode } = await params;

    const { searchParams } = new URL(req.url);
    const bulan = Number(searchParams.get("bulan")) || new Date().getMonth() + 1;
    const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

    const cacheKey = `laporan:${categoryCode}:${bulan}:${tahun}:${user.role === "OPERATOR" ? user.puskesmasId : "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    // 1. Find dynamic category by code
    const category = await prisma.dynamicCategory.findFirst({
      where: { code: { equals: categoryCode, mode: "insensitive" } },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const where: any = { categoryId: category.id, bulan, tahun };

    if (user.role === "OPERATOR" && user.puskesmasId) {
      where.puskesmasId = user.puskesmasId;
    }

    // 2. Fetch reports with values, parameters, subcategories
    const data = await prisma.dynamicLaporan.findMany({
      where,
      include: {
        puskesmas: true,
        values: {
          include: {
            parameter: true,
            subCategory: true,
          },
        },
      },
      orderBy: { puskesmas: { urutan: "asc" } },
    });

    await cacheSet(cacheKey, data, 180);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch reports" }, { status: 500 });
  }
}

// POST handler to upsert dynamic reports and values
export async function POST(req: NextRequest, { params }: { params: Promise<{ categoryCode: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { categoryCode } = await params;

    // 1. Find dynamic category by code
    const category = await prisma.dynamicCategory.findFirst({
      where: { code: { equals: categoryCode, mode: "insensitive" } },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const body = await req.json();
    const { puskesmasId, bulan, tahun, values, catatan, status } = body;

    if (!puskesmasId || !bulan || !tahun || !Array.isArray(values)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // FIX: Enforce approval workflow
    // Operator can only save as DRAFT or SUBMITTED
    // APPROVED status can only be set by ADMIN
    const allowedStatuses = user.role === "ADMIN" ? ["DRAFT", "SUBMITTED", "APPROVED"] : ["DRAFT", "SUBMITTED"];

    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Operator tidak dapat mengubah status ke ${status}. Hubungi Admin untuk approval.` },
        { status: 403 },
      );
    }

    // Operator can only write to their own puskesmas
    if (user.role === "OPERATOR" && Number(puskesmasId) !== user.puskesmasId) {
      return NextResponse.json({ error: "Forbidden: bukan puskesmas Anda" }, { status: 403 });
    }

    // 2. Fetch existing report to determine if this is an UPDATE or CREATE
    const existingLaporan = await prisma.dynamicLaporan.findUnique({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: Number(puskesmasId),
          categoryId: category.id,
          bulan: Number(bulan),
          tahun: Number(tahun),
        },
      },
      include: { values: true },
    });

    const actionType = existingLaporan ? "UPDATE" : "CREATE";

    // 3. Upsert report inside transaction to ensure atomic consistency
    const result = await prisma.$transaction(async (tx) => {
      // Find or create the main DynamicLaporan row
      const laporan = await tx.dynamicLaporan.upsert({
        where: {
          puskesmasId_categoryId_bulan_tahun: {
            puskesmasId: Number(puskesmasId),
            categoryId: category.id,
            bulan: Number(bulan),
            tahun: Number(tahun),
          },
        },
        update: {
          catatan: catatan || null,
          status: status || undefined,
          updatedBy: user.id,
        },
        create: {
          puskesmasId: Number(puskesmasId),
          categoryId: category.id,
          bulan: Number(bulan),
          tahun: Number(tahun),
          catatan: catatan || null,
          status: status || "DRAFT",
          createdBy: user.id,
          updatedBy: user.id,
        },
      });

      // Targeted Upsert for Parameter Values
      if (values.length > 0) {
        for (const val of values) {
          const paramId = Number(val.parameterId);
          const subCatId = val.subCategoryId ? Number(val.subCategoryId) : null;
          const valStr = String(val.value);

          const existingVal = existingLaporan?.values.find(
            (v) => v.parameterId === paramId && v.subCategoryId === subCatId,
          );

          if (existingVal) {
            if (existingVal.value !== valStr) {
              await tx.dynamicLaporanValue.update({
                where: { id: existingVal.id },
                data: { value: valStr },
              });
            }
          } else {
            await tx.dynamicLaporanValue.create({
              data: {
                laporanId: laporan.id,
                parameterId: paramId,
                subCategoryId: subCatId,
                value: valStr,
              },
            });
          }
        }

        // Delete removed values if any
        const incomingKeys = new Set(values.map((v: any) => `${v.parameterId}_${v.subCategoryId || ""}`));
        const toDelete =
          existingLaporan?.values.filter((v) => !incomingKeys.has(`${v.parameterId}_${v.subCategoryId || ""}`)) || [];

        for (const delVal of toDelete) {
          await tx.dynamicLaporanValue.delete({ where: { id: delVal.id } });
        }
      } else if (existingLaporan && existingLaporan.values.length > 0) {
        await tx.dynamicLaporanValue.deleteMany({ where: { laporanId: laporan.id } });
      }

      // Return full report object with values for audit logging
      const finalReport = await tx.dynamicLaporan.findUnique({
        where: { id: laporan.id },
        include: { values: true },
      });

      // Create Audit Log inside transaction
      if (finalReport) {
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: actionType,
            tableName: "dynamic_laporan",
            recordId: finalReport.id,
            oldData: existingLaporan ? JSON.parse(JSON.stringify(existingLaporan)) : undefined,
            newData: JSON.parse(JSON.stringify(finalReport)),
          },
        });
      }

      return finalReport;
    });

    // Invalidate related caches
    await cacheInvalidate(`laporan:${categoryCode}:*`);
    await cacheInvalidate(`dashboard:*`);
    await cacheInvalidate(`trend:*`);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save dynamic report" }, { status: 500 });
  }
}
