import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { aggregateInspectionToLaporan } from "@/lib/aggregate-inspection";

// GET List hasil pemeriksaan
export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;

  const where = role === "ADMIN" ? {} : { puskesmasId: pkmId };

  const results = await prisma.inspectionResult.findMany({
    where,
    include: {
      template: { include: { subCategory: true } },
      puskesmas: true,
      user: true,
      sasaran: true,
      values: { include: { field: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(results);
});

// POST Submit hasil pemeriksaan
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const userId = (req as any).user?.id;
  const pkmId = (req as any).user?.puskesmasId;

  if (!pkmId) {
    return NextResponse.json({ error: "Akun Anda tidak terhubung ke Puskesmas. Hubungi admin." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const res = await tx.inspectionResult.create({
        data: {
          templateId: body.templateId,
          puskesmasId: pkmId,
          userId: userId,
          sasaranId: body.sasaranId ? Number(body.sasaranId) : null,
          namaSasaran: body.namaSasaran,
          alamatSasaran: body.alamatSasaran,
          lat: body.lat ? parseFloat(body.lat) : null,
          lng: body.lng ? parseFloat(body.lng) : null,
          status: "APPROVED",
          bulan: body.bulan || new Date().getMonth() + 1,
          tahun: body.tahun || new Date().getFullYear(),
          tanggal: body.tanggalPemeriksaan ? new Date(body.tanggalPemeriksaan) : null,
          signatureData: body.signatureData ? body.signatureData : null,
          fotoPaths: body.fotoPaths ? body.fotoPaths : null,
          values: {
            create: body.values.map((v: any) => ({
              fieldId: v.fieldId,
              valueString: v.valueString !== undefined && v.valueString !== null ? String(v.valueString) : null,
              valueNumber:
                v.valueNumber !== undefined && v.valueNumber !== null && !Number.isNaN(parseFloat(v.valueNumber))
                  ? parseFloat(v.valueNumber)
                  : null,
            })),
          },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          tableName: "inspection_result",
          recordId: res.id,
          newData: { namaSasaran: body.namaSasaran, alamatSasaran: body.alamatSasaran, status: "APPROVED" },
        },
      });

      return res;
    });

    // Jalankan agregasi ke laporan bulanan
    try {
      await aggregateInspectionToLaporan(result.id);
    } catch (aggErr) {
      console.error("Failed to aggregate inspection to laporan:", aggErr);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/inspection/results error:", err);
    return NextResponse.json({ error: `Gagal menyimpan: ${err.message || "Unknown error"}` }, { status: 500 });
  }
});
