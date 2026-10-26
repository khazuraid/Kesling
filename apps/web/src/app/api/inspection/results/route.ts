import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { aggregateInspectionToLaporan } from "@/lib/aggregate-inspection";
import { withAuth } from "@/lib/api-auth";
import { saveBase64Photo } from "@/lib/photo-files";

// GET List hasil pemeriksaan (ringan & cepat)
export const GET = withAuth(async (req: NextRequest) => {
  const pkmId = (req as any).user?.puskesmasId;
  const role = (req as any).user?.role;
  const sp = req.nextUrl.searchParams;
  const full = sp.get("full") === "1" || sp.get("full") === "true";
  const paginated = sp.get("paginated") === "1";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(sp.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const search = (sp.get("search") || "").trim();

  const where: any = role === "ADMIN" ? {} : { puskesmasId: pkmId };
  if (search) {
    where.OR = [
      { namaSasaran: { contains: search, mode: "insensitive" } },
      { alamatSasaran: { contains: search, mode: "insensitive" } },
      { sasaran: { nama: { contains: search, mode: "insensitive" } } },
      { sasaran: { alamat: { contains: search, mode: "insensitive" } } },
      { template: { nama: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (full) {
    const results = await prisma.inspectionResult.findMany({
      where,
      include: {
        template: { include: { subCategory: true, fields: { orderBy: { urutan: "asc" } } } },
        puskesmas: true,
        user: { select: { id: true, nama: true, email: true } },
        sasaran: true,
        values: { include: { field: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(results);
  }

  // Proyeksi ringan agar response cepat (< 100ms) tanpa megabyte base64
  const select = {
    id: true,
    templateId: true,
    puskesmasId: true,
    userId: true,
    sasaranId: true,
    namaSasaran: true,
    alamatSasaran: true,
    lat: true,
    lng: true,
    status: true,
    catatan: true,
    bulan: true,
    tahun: true,
    tanggal: true,
    createdAt: true,
    updatedAt: true,
    template: {
      select: {
        id: true,
        nama: true,
        deskripsi: true,
        config: true,
      },
    },
    puskesmas: {
      select: {
        id: true,
        nama: true,
      },
    },
    sasaran: {
      select: {
        id: true,
        nama: true,
        alamat: true,
        pemilik: true,
      },
    },
    user: {
      select: {
        id: true,
        nama: true,
        email: true,
      },
    },
  };

  if (paginated) {
    const total = await prisma.inspectionResult.count({ where });
    const data = await prisma.inspectionResult.findMany({
      where,
      select,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  const results = await prisma.inspectionResult.findMany({
    where,
    select,
    orderBy: { createdAt: "desc" },
    take: 100,
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
        let valJson = v.valueJson !== undefined ? v.valueJson : null;
        if (!valJson && Array.isArray(v.value)) {
          valJson = v.value;
        }
        if (Array.isArray(valJson) && !valStr) {
          valStr = valJson.join(", ");
        }
        return {
          fieldId: v.fieldId,
          valueString: valStr,
          valueNumber:
            v.valueNumber !== undefined && v.valueNumber !== null && !Number.isNaN(parseFloat(v.valueNumber))
              ? parseFloat(v.valueNumber)
              : null,
          valueJson: valJson,
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

        // Sinkronkan identitas sasaran dari field __META__ (penggabungan data dasar
        // dengan form pemeriksaan). Hanya isi yang masih kosong agar tidak menimpa
        // data dasar yang sudah diisi operator.
        const metaSync = await tx.inspectionTemplate.findUnique({
          where: { id: body.templateId },
          select: { fields: { select: { id: true, pertanyaan: true, grup: true } } },
        });
        const pickMeta = (...keys: string[]) => {
          for (const key of keys) {
            const f = (metaSync?.fields || []).find(
              (x: any) => x.grup === "__META__" && String(x.pertanyaan).toLowerCase().includes(key),
            );
            if (!f) continue;
            const v = processedValues.find((p: any) => p.fieldId === f.id);
            const text = String(v?.valueString ?? "").trim();
            if (text) return text;
          }
          return "";
        };
        const existing = await tx.sasaran.findUnique({
          where: { id: sasaranId },
          select: { alamat: true, pemilik: true, kontak: true },
        });
        const patch: Record<string, string> = {};
        if (!existing?.alamat) {
          const alamat = pickMeta("alamat", "lokasi");
          if (alamat) patch.alamat = alamat;
        }
        if (!existing?.pemilik) {
          const pemilik = pickMeta("pengelola", "pemilik", "penanggung jawab");
          if (pemilik) patch.pemilik = pemilik;
        }
        if (!existing?.kontak) {
          const kontak = pickMeta("kontak", "telepon", "telp", "hp");
          if (kontak) patch.kontak = kontak;
        }
        if (Object.keys(patch).length > 0) {
          await tx.sasaran.update({ where: { id: sasaranId }, data: patch });
        }
      }

      return res;
    });

    // Jalankan agregasi ke laporan bulanan secara background (non-blocking agar submit instan)
    aggregateInspectionToLaporan(result.id).catch((aggErr) => {
      console.error("Failed to aggregate inspection to laporan:", aggErr);
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/inspection/results error:", err);
    return NextResponse.json({ error: `Gagal menyimpan: ${err.message || "Unknown error"}` }, { status: 500 });
  }
});
