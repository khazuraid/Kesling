import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";
import { computeResultSkor } from "@/lib/result-skor";

// ponytail: server-side jsPDF reuse; template/branding upgrade later
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const resultId = Number(id);
  if (!Number.isFinite(resultId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const result = await prisma.inspectionResult.findUnique({
    where: { id: resultId },
    include: {
      template: { select: { nama: true, config: true } },
      user: { select: { nama: true } },
      values: { include: { field: { select: { pertanyaan: true, tipe: true } } } },
    },
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const skor = computeResultSkor(
    result.values.map((v: any) => ({
      valueString: v.valueString,
      valueNumber: v.valueNumber,
      field: v.field ? { tipe: v.field.tipe, grup: null, config: null } : null,
    })),
    (result.template as any)?.config,
  );

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait" });

  doc.setFontSize(16);
  doc.text("Hasil Inspeksi Kesling", 14, 18);
  doc.setFontSize(10);
  doc.text(`No: ${result.id} · ${(result.tanggal ?? result.createdAt).toLocaleDateString("id-ID")}`, 14, 25);

  const body: string[][] = [
    ["Template", result.template?.nama ?? "-"],
    ["Sasaran", result.namaSasaran ?? "-"],
    ["Alamat", result.alamatSasaran ?? "-"],
    ["Status", result.status],
    ["Petugas", result.user?.nama ?? "-"],
  ];
  if (skor != null)
    body.push(["Skor", `${skor}${skor <= 100 ? "%" : ""} (${skor >= 80 ? "Baik" : skor >= 60 ? "Cukup" : "Kurang"})`]);

  autoTable(doc, {
    startY: 32,
    head: [["Detail", "Nilai"]],
    body,
    theme: "grid",
    headStyles: { fillColor: [0, 168, 118] },
  });

  const rows = result.values.map((v: any) => [
    v.field?.pertanyaan ?? `Field ${v.fieldId}`,
    v.valueString ?? (v.valueNumber != null ? String(v.valueNumber) : "-"),
  ]);
  if (rows.length) {
    autoTable(doc, {
      head: [["Pertanyaan", "Jawaban"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: [0, 168, 118] },
    });
  }

  // Foto dokumentasi (path yang bisa diakses publik)
  const fotos = ((result.fotoPaths as string[] | null) ?? []).filter(Boolean);
  if (fotos.length) {
    autoTable(doc, {
      head: [["Foto Dokumentasi"]],
      body: fotos.map((p) => [new URL(p, process.env.NEXTAUTH_URL ?? "http://localhost:3000").toString()]),
      theme: "grid",
      headStyles: { fillColor: [0, 168, 118] },
    });
  }

  const sig = result.signatureData as { petugas?: string; pemilik?: string } | null;
  const petugasB64 = sig?.petugas;
  const pemilikB64 = sig?.pemilik;
  let sigY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 40;
  if (petugasB64 || pemilikB64) {
    doc.setFontSize(10);
    doc.text("Tanda Tangan:", 14, sigY);
    sigY += 4;
    const sigW = 60;
    const sigH = 24;
    if (petugasB64) {
      doc.text("Petugas,", 14, sigY + 2);
      try {
        doc.addImage(`data:image/png;base64,${petugasB64}`, "PNG", 14, sigY + 4, sigW, sigH);
      } catch {}
      doc.text(`(${result.user?.nama ?? "Petugas"})`, 14, sigY + sigH + 10);
    }
    if (pemilikB64) {
      const x2 = 110;
      doc.text("Pemilik Sasaran,", x2, sigY + 2);
      try {
        doc.addImage(`data:image/png;base64,${pemilikB64}`, "PNG", x2, sigY + 4, sigW, sigH);
      } catch {}
      doc.text(`(${result.namaSasaran ?? "Pemilik"})`, x2, sigY + sigH + 10);
    }
  }

  const pdf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeksi-${resultId}.pdf"`,
    },
  });
}
