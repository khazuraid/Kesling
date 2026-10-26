import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withLaporanAuth } from "@/lib/api-auth";
import { cacheGet, cacheInvalidate, cacheSet } from "@/lib/redis";
import type { getCurrentUser } from "@/lib/session";

type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// GET handler to fetch dynamic reports and values
export const GET = withLaporanAuth(async (req: NextRequest, ctx: any) => {
  try {
    const { params } = ctx;
    const user = (req as unknown as { user: SessionUser }).user;

    const { categoryCode } = await params;

    const { searchParams } = new URL(req.url);
    const rawBulan = searchParams.get("bulan");
    const bulan = rawBulan !== null && !Number.isNaN(Number(rawBulan)) ? Number(rawBulan) : new Date().getMonth() + 1;
    const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();

    const cacheKey = `laporan:${categoryCode}:${bulan}:${tahun}:${user.role === "OPERATOR" ? user.puskesmasId : "all"}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return NextResponse.json(cached);

    // 1. Find dynamic category by code
    const category = await prisma.dynamicCategory.findFirst({
      where: { code: { equals: categoryCode, mode: "insensitive" } },
      include: {
        parameters: true,
        subCategories: true,
      },
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

    // 3. Auto-sync sasaran dari Data Dasar (prisma.sasaran) ke parameter Terdaftar jika belum terisi
    const paramTerdaftar =
      category.parameters.find(
        (p) =>
          p.code === "terdaftar" ||
          p.code === "jumlahTotal" ||
          p.code === "jumlahSarana" ||
          (p.code === "jumlah" && p.isBaseline),
      ) || category.parameters.find((p) => p.nama.toLowerCase().includes("terdaftar"));

    if (paramTerdaftar) {
      if (category.isRowBased) {
        const sasaranCounts = await prisma.sasaran.groupBy({
          by: ["puskesmasId", "subCategoryId"],
          where: {
            subCategory: { categoryId: category.id },
            ...(user.role === "OPERATOR" && user.puskesmasId ? { puskesmasId: user.puskesmasId } : {}),
          },
          _count: { id: true },
        });

        for (const item of sasaranCounts) {
          const count = item._count.id;
          if (count <= 0) continue;

          let report = data.find((l) => l.puskesmasId === item.puskesmasId);
          if (!report) {
            const newLaporan = await prisma.dynamicLaporan.create({
              data: {
                puskesmasId: item.puskesmasId,
                categoryId: category.id,
                bulan,
                tahun,
                status: "DRAFT",
              },
              include: {
                puskesmas: true,
                values: {
                  include: {
                    parameter: true,
                    subCategory: true,
                  },
                },
              },
            });
            data.push(newLaporan);
            report = newLaporan;
          }

          const existingVal = report.values.find(
            (v) => v.parameterId === paramTerdaftar.id && v.subCategoryId === item.subCategoryId,
          );

          if (!existingVal) {
            const createdVal = await prisma.dynamicLaporanValue.create({
              data: {
                laporanId: report.id,
                parameterId: paramTerdaftar.id,
                subCategoryId: item.subCategoryId,
                value: String(count),
              },
              include: {
                parameter: true,
                subCategory: true,
              },
            });
            report.values.push(createdVal);
          } else if (!existingVal.value || existingVal.value === "0" || Number(existingVal.value) < count) {
            const targetVal = String(Math.max(Number(existingVal.value) || 0, count));
            await prisma.dynamicLaporanValue.update({
              where: { id: existingVal.id },
              data: { value: targetVal },
            });
            existingVal.value = targetVal;
          }
        }
      } else {
        const sasaranCountsNonRow = await prisma.sasaran.groupBy({
          by: ["puskesmasId"],
          where: {
            subCategory: { categoryId: category.id },
            ...(user.role === "OPERATOR" && user.puskesmasId ? { puskesmasId: user.puskesmasId } : {}),
          },
          _count: { id: true },
        });

        for (const item of sasaranCountsNonRow) {
          const count = item._count.id;
          if (count <= 0) continue;

          let report = data.find((l) => l.puskesmasId === item.puskesmasId);
          if (!report) {
            const newLaporan = await prisma.dynamicLaporan.create({
              data: {
                puskesmasId: item.puskesmasId,
                categoryId: category.id,
                bulan,
                tahun,
                status: "DRAFT",
              },
              include: {
                puskesmas: true,
                values: {
                  include: {
                    parameter: true,
                    subCategory: true,
                  },
                },
              },
            });
            data.push(newLaporan);
            report = newLaporan;
          }

          const existingVal = report.values.find(
            (v) => v.parameterId === paramTerdaftar.id && v.subCategoryId === null,
          );

          if (!existingVal) {
            const createdVal = await prisma.dynamicLaporanValue.create({
              data: {
                laporanId: report.id,
                parameterId: paramTerdaftar.id,
                subCategoryId: null,
                value: String(count),
              },
              include: {
                parameter: true,
                subCategory: true,
              },
            });
            report.values.push(createdVal);
          } else if (!existingVal.value || existingVal.value === "0" || Number(existingVal.value) < count) {
            const targetVal = String(Math.max(Number(existingVal.value) || 0, count));
            await prisma.dynamicLaporanValue.update({
              where: { id: existingVal.id },
              data: { value: targetVal },
            });
            existingVal.value = targetVal;
          }
        }
      }
    }

    await cacheSet(cacheKey, data, 180);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch reports" }, { status: 500 });
  }
});

// POST handler to upsert dynamic reports and values
export const POST = withLaporanAuth(async (req: NextRequest, ctx: any) => {
  try {
    const { params } = ctx;
    const user = (req as unknown as { user: SessionUser }).user;

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

    if (!puskesmasId || bulan === undefined || bulan === null || !tahun || !Array.isArray(values)) {
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
});
