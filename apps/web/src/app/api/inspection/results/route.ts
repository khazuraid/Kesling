import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { aggregateInspectionToLaporan } from "@/lib/aggregate-inspection";
import { withAuth } from "@/lib/api-auth";
import { saveBase64Photo } from "@/lib/photo-files";

// GET List hasil pemeriksaan
export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;

  const where = role === "ADMIN" ? {} : { puskesmasId: pkmId };

  const results = await prisma.inspectionResult.findMany({
    where,
    include: {
      template: { include: { subCategory: true, fields: { orderBy: { urutan: "asc" } } } },
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
      const res = await tx.inspectionResult.create({
        data: {
          templateId: body.templateId,
          puskesmasId: pkmId,
          userId: userId,
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
          bulan: body.bulan || new Date().getMonth() + 1,
          tahun: body.tahun || new Date().getFullYear(),
          tanggal: body.tanggalPemeriksaan ? new Date(body.tanggalPemeriksaan) : new Date(),
          signatureData: body.signatureData ? body.signatureData : null,
          fotoPaths: processedFotoPaths.length > 0 ? processedFotoPaths : body.fotoPaths ? body.fotoPaths : null,
          values: {
            create: processedValues,
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

      // Auto-mark rencana bulanan as SELESAI when inspection submitted for that sasaran+periode
      const sasaranId = body.sasaranId ? Number(body.sasaranId) : null;
      const b = body.bulan || new Date().getMonth() + 1;
      const y = body.tahun || new Date().getFullYear();
      if (sasaranId) {
        await tx.rencanaBulanan.updateMany({
          where: { puskesmasId: pkmId, sasaranId, bulan: b, tahun: y, status: { not: "SELESAI" } },
          data: { status: "SELESAI" },
        });
      }

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
