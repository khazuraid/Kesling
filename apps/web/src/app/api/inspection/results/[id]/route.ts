import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { aggregateInspectionToLaporan } from "@/lib/aggregate-inspection";

// PUT - Edit hasil pemeriksaan
export const PUT = withAuth(async (req: NextRequest, context: any) => {
  const { id } = await context.params;
  const body = await req.json();
  const userId = (req as any).user?.id;
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const resultId = parseInt(id);

  if (isNaN(resultId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const existing = await prisma.inspectionResult.findUnique({ where: { id: resultId } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (role !== "ADMIN" && existing.puskesmasId !== pkmId) {
      return NextResponse.json({ error: "Anda tidak punya akses" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const res = await prisma.inspectionResult.update({
        where: { id: resultId },
        data: {
          sasaranId: body.sasaranId ? Number(body.sasaranId) : null,
          namaSasaran: body.namaSasaran,
          alamatSasaran: body.alamatSasaran,
          lat: body.lat ? parseFloat(body.lat) : null,
          lng: body.lng ? parseFloat(body.lng) : null,
          status: "APPROVED",
          bulan: body.bulan || existing.bulan,
          tahun: body.tahun || existing.tahun,
          signatureData: body.signatureData || undefined,
          fotoPaths: body.fotoPaths || undefined,
        },
      });

      await tx.inspectionResultValue.deleteMany({ where: { resultId } });
      await tx.inspectionResultValue.createMany({
        data: body.values.map((v: any) => ({
          resultId,
          fieldId: v.fieldId,
          valueString: v.valueString !== undefined && v.valueString !== null ? String(v.valueString) : null,
          valueNumber:
            v.valueNumber !== undefined && v.valueNumber !== null && !Number.isNaN(parseFloat(v.valueNumber))
              ? parseFloat(v.valueNumber)
              : null,
        })),
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

    // Re-agregasi ke laporan bulanan setelah update
    try {
      await aggregateInspectionToLaporan(resultId);
    } catch (aggErr) {
      console.error("Failed to aggregate inspection to laporan:", aggErr);
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
  const resultId = parseInt(id);

  if (isNaN(resultId)) {
    return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });
  }

  try {
    const existing = await prisma.inspectionResult.findUnique({ where: { id: resultId } });
    if (!existing) {
      return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    }
    if (role !== "ADMIN" && existing.puskesmasId !== pkmId) {
      return NextResponse.json({ error: "Anda tidak punya akses" }, { status: 403 });
    }

    await prisma.inspectionResultValue.deleteMany({ where: { resultId } });
    await prisma.inspectionResult.delete({ where: { id: resultId } });

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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/inspection/results/[id] error:", err);
    return NextResponse.json({ error: `Gagal hapus: ${err.message || "Unknown error"}` }, { status: 500 });
  }
});
