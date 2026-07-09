import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { aggregateInspectionToLaporan } from "@/lib/aggregate-inspection";
import { getMobileUser } from "@/lib/mobile-auth";

function pickValue(values: Record<string, unknown>, key: string) {
  const value = values[key];
  return value === undefined || value === null ? "" : String(value).trim();
}

function mapDraftValue(fieldQuestion: string, values: Record<string, unknown>) {
  const q = fieldQuestion.toLowerCase();
  if (q.includes("nama")) return pickValue(values, "nama");
  if (q.includes("alamat")) return pickValue(values, "alamat");
  if (q.includes("pemilik") || q.includes("penanggung")) return pickValue(values, "pemilik");
  if (q.includes("hasil") || q.includes("catatan") || q.includes("temuan")) return pickValue(values, "hasil");
  return "";
}

async function saveMobilePhotos(photos: any[] | undefined) {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const uploadDir = path.join(process.cwd(), "public", "uploads", "mobile");
  await mkdir(uploadDir, { recursive: true });
  const paths: string[] = [];
  for (const photo of photos.slice(0, 6)) {
    if (!photo?.base64) continue;
    const mime = String(photo.mimeType || "image/jpeg");
    const ext = mime.includes("png") ? "png" : "jpg";
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    await writeFile(path.join(uploadDir, fileName), Buffer.from(photo.base64, "base64"));
    paths.push(`/uploads/mobile/${fileName}`);
  }
  return paths;
}

export async function POST(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });
  if (user.role !== "OPERATOR" || !user.puskesmasId) {
    return NextResponse.json(
      { error: "Sinkronisasi mobile hanya tersedia untuk Operator Puskesmas." },
      { status: 403 },
    );
  }

  const puskesmasId = user.puskesmasId;
  const body = await req.json();
  const localId = String(body.localId || "");
  const values = (body.values || {}) as Record<string, unknown>;
  const fieldValues = (body.fieldValues || {}) as Record<string, unknown>;
  const namaSasaran = pickValue(values, "nama");
  const alamatSasaran = pickValue(values, "alamat");
  const hasil = pickValue(values, "hasil");
  if (!localId) return NextResponse.json({ error: "localId draft wajib dikirim." }, { status: 400 });
  if (!namaSasaran || !alamatSasaran) {
    return NextResponse.json({ error: "Nama sasaran dan alamat wajib diisi sebelum sinkronisasi." }, { status: 400 });
  }

  const existingLog = await prisma.auditLog.findFirst({
    where: { tableName: "inspection_result", newData: { path: ["localId"], equals: localId } },
    orderBy: { id: "desc" },
  });
  if (existingLog?.recordId) {
    const existing = await prisma.inspectionResult.findUnique({ where: { id: existingLog.recordId } });
    if (existing)
      return NextResponse.json({
        id: existing.id,
        status: existing.status,
        syncedAt: existing.updatedAt,
        duplicate: true,
      });
  }

  const templateId = Number(body.templateId);
  const template = await prisma.inspectionTemplate.findFirst({
    where: {
      isActive: true,
      ...(Number.isFinite(templateId) ? { id: templateId } : {}),
      OR: [{ puskesmasId }, { puskesmasId: null }],
    },
    include: { fields: { orderBy: { urutan: "asc" } } },
    orderBy: [{ puskesmasId: "desc" }, { updatedAt: "desc" }],
  });
  if (!template) return NextResponse.json({ error: "Template pemeriksaan aktif tidak ditemukan." }, { status: 400 });

  const tanggal = body.createdAt ? new Date(body.createdAt) : new Date();
  const fotoPaths = await saveMobilePhotos(body.photos);
  const signatureData = body.signature ? { ...(body.signature as object), source: "mobile" } : undefined;

  const result = await prisma.$transaction(async (tx) => {
    const saved = await tx.inspectionResult.create({
      data: {
        templateId: template.id,
        puskesmasId,
        userId: user.id,
        namaSasaran,
        alamatSasaran,
        lat: body.lat === null || body.lat === undefined ? null : Number(body.lat),
        lng: body.lng === null || body.lng === undefined ? null : Number(body.lng),
        status: "APPROVED",
        bulan: tanggal.getMonth() + 1,
        tahun: tanggal.getFullYear(),
        tanggal,
        fotoPaths,
        signatureData,
        catatan: hasil || null,
        values: {
          create: template.fields
            .map((field) => {
              const raw = fieldValues[String(field.id)] ?? mapDraftValue(field.pertanyaan, values);
              const text = raw === undefined || raw === null ? "" : String(raw).trim();
              return { fieldId: field.id, valueString: text || null, valueNumber: null };
            })
            .filter((item) => item.valueString !== null),
        },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        tableName: "inspection_result",
        recordId: saved.id,
        newData: { source: "mobile_offline_sync", localId, namaSasaran, alamatSasaran, status: "APPROVED" },
      },
    });
    return saved;
  });

  try {
    await aggregateInspectionToLaporan(result.id);
  } catch (error) {
    console.error("Mobile offline sync aggregation failed:", error);
  }

  return NextResponse.json({ id: result.id, status: result.status, syncedAt: new Date().toISOString() });
}
