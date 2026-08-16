import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

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
      template: { select: { nama: true } },
      user: { select: { nama: true } },
      values: { include: { field: { select: { pertanyaan: true } } } },
    },
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "portrait" });

  doc.setFontSize(16);
  doc.text("Hasil Inspeksi Kesling", 14, 18);
  doc.setFontSize(10);
  doc.text(`No: ${result.id} · ${(result.tanggal ?? result.createdAt).toLocaleDateString("id-ID")}`, 14, 25);

  autoTable(doc, {
    startY: 32,
    head: [["Detail", "Nilai"]],
    body: [
      ["Template", result.template?.nama ?? "-"],
      ["Sasaran", result.namaSasaran ?? "-"],
      ["Alamat", result.alamatSasaran ?? "-"],
      ["Status", result.status],
      ["Petugas", result.user?.nama ?? "-"],
    ],
    theme: "grid",
    headStyles: { fillColor: [0, 168, 118] },
  });

  const rows = result.values.map((v) => [
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

  const pdf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="inspeksi-${resultId}.pdf"`,
    },
  });
}
