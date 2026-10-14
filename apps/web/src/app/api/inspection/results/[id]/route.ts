import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { aggregateInspectionToLaporan, recalculateLaporanBulanan } from "@/lib/aggregate-inspection";
import { withAuth } from "@/lib/api-auth";
import { deletePhotoFiles, saveBase64Photo } from "@/lib/photo-files";

// PUT - Edit hasil pemeriksaan
export const PUT = withAuth(async (req: NextRequest, context: any) => {
  const { id } = await context.params;
  const body = await req.json();
  const userId = (req as any).user?.id;
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const resultId = parseInt(id, 10);

  if (Number.isNaN(resultId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const existing = await prisma.inspectionResult.findUnique({
      where: { id: resultId },
      include: { template: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (role !== "ADMIN" && existing.puskesmasId !== pkmId) {
      return NextResponse.json({ error: "Anda tidak punya akses" }, { status: 403 });
    }

    const oldBulan = existing.bulan;
    const oldTahun = existing.tahun;
    const newBulan = body.bulan || existing.bulan;
    const newTahun = body.tahun || existing.tahun;
    const isPeriodChanged = oldBulan !== newBulan || oldTahun !== newTahun;

    // Simpan foto berformat base64 ke disk /uploads/inspections/
    const processedFotoPaths: string[] = [];
    if (Array.isArray(body.fotoPaths)) {
      for (const fp of body.fotoPaths) {
        if (typeof fp === "string" && fp.startsWith("data:image/")) {
          const savedPath = await saveBase64Photo(fp, "inspections");
          processedFotoPaths.push(savedPath);
        } else if (fp) {
          processedFotoPaths.push(String(fp));
        }
      }
    }

    const processedValues = await Promise.all(
      (body.values || []).map(async (v: any) => {
        let valStr = v.valueString !== undefined && v.valueString !== null ? String(v.valueString) : null;
        if (valStr?.startsWith("data:image/") && !valStr.startsWith("data:image/png;base64,iVBORw0KGgo")) {
          valStr = await saveBase64Photo(valStr, "inspections");
        }
        return {
          resultId,
          fieldId: v.fieldId,
          valueString: valStr,
          valueNumber:
            v.valueNumber !== undefined && v.valueNumber !== null && !Number.isNaN(parseFloat(v.valueNumber))
              ? parseFloat(v.valueNumber)
              : null,
        };
      }),
    );

    const result = await prisma.$transaction(async (tx) => {
      const res = await tx.inspectionResult.update({
        where: { id: resultId },
        data: {
          sasaranId: body.sasaranId ? Number(body.sasaranId) : null,
          namaSasaran: body.namaSasaran,
          alamatSasaran: body.alamatSasaran,
          lat:
            body.lat !== undefined && body.lat !== null && !Number.isNaN(parseFloat(body.lat))
              ? parseFloat(body.lat)
              : null,
          lng:
            body.lng !== undefined && body.lng !== null && !Number.isNaN(parseFloat(body.lng))
              ? parseFloat(body.lng)
              : null,
          status: "APPROVED",
          bulan: newBulan,
          tahun: newTahun,
          tanggal: body.tanggalPemeriksaan ? new Date(body.tanggalPemeriksaan) : existing.tanggal,
          signatureData: body.signatureData !== undefined ? body.signatureData : existing.signatureData,
          fotoPaths:
            body.fotoPaths !== undefined
              ? processedFotoPaths.length > 0
                ? processedFotoPaths
                : body.fotoPaths
              : existing.fotoPaths,
        },
      });

      await tx.inspectionResultValue.deleteMany({ where: { resultId } });
      await tx.inspectionResultValue.createMany({
        data: processedValues,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "UPDATE",
          tableName: "inspection_result",
          recordId: resultId,
          newData: { namaSasaran: body.namaSasaran, status: "APPROVED" },
        },
      });

      return res;
    });

    // Re-agregasi ke laporan bulanan periode baru setelah update
    try {
      await aggregateInspectionToLaporan(resultId);
    } catch (aggErr) {
      console.error("Failed to aggregate inspection to laporan:", aggErr);
    }

    // Jika periode bulan/tahun diubah, hitung ulang laporan periode lama agar tidak orphan
    if (isPeriodChanged && existing.template?.subCategoryId) {
      try {
        await recalculateLaporanBulanan({
          puskesmasId: existing.puskesmasId,
          categoryId: existing.template.categoryId,
          subCategoryId: existing.template.subCategoryId,
          bulan: oldBulan,
          tahun: oldTahun,
        });
      } catch (aggErr) {
        console.error("Failed to recalculate previous period laporan:", aggErr);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("PUT /api/inspection/results/[id] error:", err);
    return NextResponse.json({ error: `Gagal update: ${err.message || "Unknown error"}` }, { status: 500 });
  }
});

// DELETE - Hapus hasil pemeriksaan
export const DELETE = withAuth(async (req: NextRequest, context: any) => {
  const { id } = await context.params;
  const userId = (req as any).user?.id;
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const resultId = parseInt(id, 10);

  if (Number.isNaN(resultId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const existing = await prisma.inspectionResult.findUnique({
      where: { id: resultId },
      include: { template: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (role !== "ADMIN" && existing.puskesmasId !== pkmId) {
      return NextResponse.json({ error: "Anda tidak punya akses" }, { status: 403 });
    }

    const { puskesmasId, bulan, tahun, template } = existing;
    const subCategoryId = template?.subCategoryId;
    const categoryId = template?.categoryId;

    await prisma.inspectionResultValue.deleteMany({ where: { resultId } });
    await prisma.inspectionResult.delete({ where: { id: resultId } });
    await deletePhotoFiles(existing.fotoPaths);

    await prisma.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        tableName: "inspection_result",
        recordId: resultId,
        oldData: { namaSasaran: existing.namaSasaran, status: existing.status },
        newData: {},
      },
    });

    // Re-agregasi ke laporan bulanan setelah delete agar angka laporan tidak stale
    if (subCategoryId) {
      try {
        await recalculateLaporanBulanan({
          puskesmasId,
          categoryId,
          subCategoryId,
          bulan,
          tahun,
        });
      } catch (aggErr) {
        console.error("Failed to recalculate laporan after deletion:", aggErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/inspection/results/[id] error:", err);
    return NextResponse.json({ error: `Gagal hapus: ${err.message || "Unknown error"}` }, { status: 500 });
  }
});
