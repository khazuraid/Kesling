/**
 * Generator PDF Berita Acara & Hasil Inspeksi Kesehatan Lingkungan (IKL)
 * Terstruktur, modern, menampilkan visual foto dokumentasi & tanda tangan digital (TTD).
 */

export interface InspectionDetailData {
  id: number;
  templateId?: number;
  namaSasaran?: string;
  alamatSasaran?: string;
  lat?: number | null;
  lng?: number | null;
  status?: string;
  catatan?: string | null;
  bulan?: number;
  tahun?: number;
  tanggal?: string | Date | null;
  createdAt: string | Date;
  signatureData?: any;
  fotoPaths?: any;
  template?: any;
  puskesmas?: { id?: number; nama: string };
  sasaran?: {
    id?: number;
    nama: string;
    alamat?: string | null;
    pemilik?: string | null;
    kontak?: string | null;
    lat?: number | null;
    lng?: number | null;
    subCategory?: { nama: string };
  };
  user?: { id?: number; nama: string; email?: string };
  values?: Array<{
    fieldId: number;
    valueString?: string | null;
    valueNumber?: number | null;
    field?: any;
  }>;
}

/**
 * Konversi URL foto (relatif / absolut) ke DataURL base64 di browser dengan batas resolusi agar PDF ringan
 */
async function getPhotoDataUrl(url: string, maxWidth = 960, maxHeight = 720): Promise<string | null> {
  if (!url || typeof url !== "string") return null;
  if (url.startsWith("data:image/")) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        resolve(dataUrl);
      } catch (err) {
        console.warn("Gagal konversi gambar canvas untuk PDF:", err);
        resolve(null);
      }
    };
    img.onerror = () => {
      // Coba fetch langsung jika crossOrigin Image gagal
      fetch(url)
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(null));
    };
    img.src = url;
  });
}

/**
 * Format tanggal Indonesia
 */
function formatTanggalId(dateVal?: string | Date | null): string {
  if (!dateVal) return "-";
  try {
    const d = new Date(dateVal);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(dateVal);
  }
}

/**
 * Hitung skor dan evaluasi kelulusan
 */
export function calculateInspectionScore(result: InspectionDetailData, template: any) {
  const fields = template?.fields || [];
  const config = template?.config || {};
  const values = result.values || [];

  const rumus = config.rumus || "percentage";
  const thresh = Number(config.thresholdValue ?? 80);
  const op = config.thresholdOperator || ">=";
  const passText = config.thresholdPassText || "Memenuhi Syarat (MS)";
  const failText = config.thresholdFailText || "Tidak Memenuhi Syarat (TMS)";

  let gained = 0;
  let max = 0;
  let countActive = 0;
  let countBenar = 0;
  let countSalah = 0;

  fields.forEach((f: any) => {
    if (f.grup === "__META__") return;
    if (f.tipe === "SIGNATURE" || f.tipe === "GPS" || f.tipe === "PHOTO") return;
    if (f.isDisabled || f.status === "DISABLED") return;

    const v = values.find((val) => val.fieldId === f.id);
    const valStr = String(v?.valueString ?? "").toUpperCase();
    if (valStr === "NA") return; // T/A dikeluarkan

    const fConfig = typeof f.config === "string" ? JSON.parse(f.config || "{}") : f.config || {};
    const skorBenar = Number(fConfig.skorBenar ?? fConfig.skor ?? (f.tipe === "BOOLEAN" ? 1 : 0));
    const skorSalah = Number(fConfig.skorSalah ?? 0);
    const itemMax = Math.max(skorBenar, skorSalah);

    if (itemMax <= 0 && f.tipe !== "BOOLEAN") return;

    countActive++;
    max += itemMax > 0 ? itemMax : 1;

    if (f.tipe === "BOOLEAN") {
      if (valStr === "TRUE") {
        gained += skorBenar > 0 ? skorBenar : 1;
        countBenar++;
      } else if (valStr === "FALSE") {
        gained += skorSalah;
        countSalah++;
      }
    } else if (f.tipe === "NUMBER") {
      const numVal = v?.valueNumber ?? (parseFloat(v?.valueString || "0") || 0);
      gained += numVal * (fConfig.skor ? Number(fConfig.skor) : 1);
    } else if (v?.valueString) {
      gained += skorBenar;
    }
  });

  const percentValue = max > 0 ? (gained / max) * 100 : 0;
  const roundedPercent = Math.round(percentValue * 10) / 10;
  let finalValue = percentValue;
  let valueText = `${roundedPercent}%`;

  if (rumus === "percentage" || rumus === "weighted") {
    finalValue = percentValue;
    valueText = `${roundedPercent}%`;
  } else if (rumus === "sum") {
    finalValue = gained;
    valueText = `${roundedPercent}%`;
  } else if (rumus === "custom" && config.customFormula) {
    try {
      const evalStr = config.customFormula
        .replace(/SUM\(\)/g, String(gained))
        .replace(/AVG\(\)/g, String(countActive > 0 ? gained / countActive : 0))
        .replace(/COUNT\(\)/g, String(countActive))
        .replace(/✓/g, String(countBenar))
        .replace(/✗/g, String(countSalah));
      const evaluated = new Function(`return ${evalStr}`)();
      if (!Number.isNaN(evaluated)) {
        finalValue = evaluated;
        valueText = `${Math.round(finalValue * 10) / 10}%`;
      }
    } catch {}
  }

  let pass = false;
  const compareValue =
    rumus === "percentage" || rumus === "weighted" || thresh <= 100
      ? rumus === "sum" && thresh > 100
        ? finalValue
        : percentValue
      : finalValue;

  if (op === ">=") pass = compareValue >= thresh;
  else if (op === ">") pass = compareValue > thresh;
  else if (op === "<=") pass = compareValue <= thresh;
  else if (op === "<") pass = compareValue < thresh;

  return {
    gained: Math.round(gained * 10) / 10,
    max: Math.round(max * 10) / 10,
    percentValue: roundedPercent,
    valueText,
    pass,
    statusText: pass ? passText : failText,
    thresh,
    op,
  };
}

/**
 * Fungsi Utama: Generate & Download PDF Berita Acara Hasil Inspeksi
 */
export async function generateInspectionPDF(
  result: InspectionDetailData,
  templateFallback?: any,
): Promise<{ success: boolean; filename: string }> {
  // Ambil library jsPDF & autoTable secara dinamis
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

  const template = result.template || templateFallback || {};
  const namaSasaran = result.sasaran?.nama || result.namaSasaran || "Sasaran Tanpa Nama";
  const alamatSasaran = result.sasaran?.alamat || result.alamatSasaran || "-";
  const pengelolaSasaran = result.sasaran?.pemilik || "-";
  const puskesmasNama = result.puskesmas?.nama || "Puskesmas";
  const petugasNama = result.user?.nama || "Petugas Sanitasi Lingkungan";
  const tanggalInspeksi = formatTanggalId(result.tanggal || result.createdAt);
  const tanggalCetak = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // 1. Accent Bars Top
  doc.setFillColor(0, 168, 118); // Emerald #00A876
  doc.rect(0, 0, pageWidth, 4, "F");
  doc.setFillColor(12, 27, 22); // Forest Dark #0C1B16
  doc.rect(0, 4, pageWidth, 1.5, "F");

  // 2. KOP Dokumen Resmi
  let currentY = 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(12, 27, 22);
  doc.text("PEMERINTAH DAERAH / DINAS KESEHATAN", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFontSize(13);
  doc.setTextColor(0, 168, 118);
  doc.text(`UPT PUSKESMAS ${puskesmasNama.toUpperCase()}`, pageWidth / 2, currentY, { align: "center" });

  currentY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Sistem Informasi Manajemen Kesehatan Lingkungan (SIMKESLING)", pageWidth / 2, currentY, {
    align: "center",
  });

  currentY += 3;
  doc.setDrawColor(0, 168, 118);
  doc.setLineWidth(0.8);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  doc.setDrawColor(12, 27, 22);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY + 0.8, marginX + contentWidth, currentY + 0.8);

  currentY += 7;

  // 3. Judul Berita Acara
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(12, 27, 22);
  doc.text("LAPORAN HASIL INSPEKSI KESEHATAN LINGKUNGAN (IKL)", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFontSize(10.5);
  doc.setTextColor(0, 168, 118);
  doc.text(template.nama || "Pemeriksaan Sarana & Tempat", pageWidth / 2, currentY, { align: "center" });

  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `No. Registrasi: IKL-${String(result.id).padStart(5, "0")} · Tanggal Cetak: ${tanggalCetak}`,
    pageWidth / 2,
    currentY,
    { align: "center" },
  );

  currentY += 5;

  // 4. Informasi Sasaran & Pelaksanaan
  const gpsCoord =
    result.lat && result.lng
      ? `${Number(result.lat).toFixed(5)}, ${Number(result.lng).toFixed(5)}`
      : result.sasaran?.lat && result.sasaran?.lng
        ? `${Number(result.sasaran.lat).toFixed(5)}, ${Number(result.sasaran.lng).toFixed(5)}`
        : "-";

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      1: { cellWidth: 59 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      3: { cellWidth: 59 },
    },
    body: [
      ["Nama Sasaran", `: ${namaSasaran}`, "Tanggal Inspeksi", `: ${tanggalInspeksi}`],
      [
        "Jenis Sarana",
        `: ${result.sasaran?.subCategory?.nama || template.subCategory?.nama || "-"}`,
        "Petugas",
        `: ${petugasNama}`,
      ],
      ["Pengelola / Pemilik", `: ${pengelolaSasaran}`, "Unit Kerja", `: ${puskesmasNama}`],
      ["Alamat", `: ${alamatSasaran}`, "Koordinat GPS", `: ${gpsCoord}`],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 4;

  // 5. Scorecard Banner
  const scoreData = calculateInspectionScore(result, template);
  const cardHeight = 16;
  const isPass = scoreData.pass;

  // Background Box Scorecard
  if (isPass) {
    doc.setFillColor(240, 253, 248); // Mint Soft
    doc.setDrawColor(0, 168, 118);
  } else {
    doc.setFillColor(254, 242, 242); // Rose Soft
    doc.setDrawColor(225, 90, 79);
  }
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, currentY, contentWidth, cardHeight, 2.5, 2.5, "FD");

  // Kolom Skor Persentase
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  if (isPass) {
    doc.setTextColor(0, 168, 118);
  } else {
    doc.setTextColor(225, 90, 79);
  }
  doc.text(scoreData.valueText, marginX + 6, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Perolehan: ${scoreData.gained} / ${scoreData.max} Poin`, marginX + 6, currentY + 12.5);

  // Status Badge Kanan
  const badgeWidth = 65;
  const badgeHeight = 9;
  const badgeX = marginX + contentWidth - badgeWidth - 4;
  const badgeY = currentY + 3.5;

  if (isPass) {
    doc.setFillColor(0, 168, 118);
  } else {
    doc.setFillColor(225, 90, 79);
  }
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(scoreData.statusText.toUpperCase(), badgeX + badgeWidth / 2, badgeY + 5.8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(113, 113, 122);
  doc.text(
    `Standar Kelulusan: ${scoreData.op} ${scoreData.thresh}%`,
    badgeX + badgeWidth / 2,
    currentY + cardHeight - 0.5,
    { align: "center" },
  );

  currentY += cardHeight + 5;

  // 6. Tabel Rincian Hasil Pemeriksaan (Kuesioner)
  const rows: any[] = [];
  const fields = (template.fields || []).filter(
    (f: any) => f.grup !== "__META__" && f.tipe !== "SIGNATURE" && f.tipe !== "PHOTO",
  );

  let currentGrup = "";
  let itemIndex = 1;

  fields.forEach((f: any) => {
    const grp = f.grup || "Komponen Pemeriksaan";
    if (grp !== currentGrup) {
      currentGrup = grp;
      // Header bagian/grup
      rows.push([
        {
          content: currentGrup.toUpperCase(),
          colSpan: 3,
          styles: { fontStyle: "bold", fillColor: [241, 245, 249], textColor: [15, 23, 42] },
        },
      ]);
    }

    const valObj = (result.values || []).find((v: any) => v.fieldId === f.id);
    let jawaban = "-";

    if (f.tipe === "BOOLEAN") {
      const u = String(valObj?.valueString || "").toUpperCase();
      jawaban = u === "TRUE" ? "YA" : u === "FALSE" ? "TIDAK" : u === "NA" ? "T/A" : "-";
    } else if (f.tipe === "NUMBER") {
      jawaban =
        valObj?.valueNumber !== null && valObj?.valueNumber !== undefined
          ? String(valObj.valueNumber)
          : valObj?.valueString || "-";
    } else if (valObj?.valueString) {
      jawaban = valObj.valueString;
    }

    rows.push([itemIndex++, f.pertanyaan, jawaban]);
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [["No", "Variabel & Komponen Penilaian", "Hasil"]],
    body: rows as any,
    theme: "striped",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: "middle",
    },
    headStyles: {
      fillColor: [12, 27, 22],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28, halign: "center", fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didParseCell: (data) => {
      // Highlight warna teks Ya (hijau) dan Tidak (merah)
      if (data.section === "body" && data.column.index === 2) {
        const val = String(data.cell.raw || "");
        if (val === "YA") {
          data.cell.styles.textColor = [0, 168, 118];
        } else if (val === "TIDAK") {
          data.cell.styles.textColor = [225, 90, 79];
        } else if (val === "T/A") {
          data.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 7. Dokumentasi Foto Lapangan (PHOTO)
  const photoUrls: string[] = [];

  // Ambil dari fotoPaths
  if (Array.isArray(result.fotoPaths)) {
    result.fotoPaths.forEach((p) => {
      if (typeof p === "string" && p) photoUrls.push(p);
    });
  }

  // Ambil dari values dengan tipe PHOTO
  (result.values || []).forEach((v: any) => {
    if (v.field?.tipe === "PHOTO" && v.valueString) {
      if (!photoUrls.includes(v.valueString)) {
        photoUrls.push(v.valueString);
      }
    }
  });

  if (photoUrls.length > 0) {
    // Muat foto-foto secara paralel
    const loadedPhotos = await Promise.all(
      photoUrls.map(async (url, idx) => {
        const dataUrl = await getPhotoDataUrl(url);
        return { index: idx + 1, dataUrl };
      }),
    );
    const validPhotos = loadedPhotos.filter((p) => Boolean(p.dataUrl));

    if (validPhotos.length > 0) {
      // Periksa sisa ruang halaman, jika tidak cukup untuk header & 1 baris foto (min 70mm), tambah halaman baru
      if (currentY + 70 > doc.internal.pageSize.getHeight() - 25) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(12, 27, 22);
      doc.text("DOKUMENTASI FOTO INSPEKSI LAPANGAN", marginX, currentY);

      doc.setDrawColor(0, 168, 118);
      doc.setLineWidth(0.6);
      doc.line(marginX, currentY + 1.5, marginX + 60, currentY + 1.5);

      currentY += 6;

      const photoW = 86;
      const photoH = 56;
      const gapX = 10;
      const gapY = 8;

      for (let i = 0; i < validPhotos.length; i++) {
        const col = i % 2;
        if (col === 0 && i > 0) {
          currentY += photoH + gapY;
        }

        // Cek halaman baru saat foto akan ditaruh
        if (currentY + photoH > doc.internal.pageSize.getHeight() - 25) {
          doc.addPage();
          currentY = 18;
        }

        const posX = marginX + col * (photoW + gapX);
        const item = validPhotos[i];

        // Box border foto
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(posX, currentY, photoW, photoH, 2, 2, "FD");

        if (item.dataUrl) {
          try {
            doc.addImage(item.dataUrl, "JPEG", posX + 1, currentY + 1, photoW - 2, photoH - 8);
          } catch (err) {
            console.warn("Gagal menambahkan foto ke PDF:", err);
          }
        }

        // Caption Foto
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Foto #${item.index} - Dokumentasi Lapangan`, posX + 3, currentY + photoH - 2.5);
      }

      currentY += photoH + 10;
    }
  }

  // 8. Lembar Pengesahan & Tanda Tangan (TTD)
  // Periksa sisa ruang halaman, butuh minimal 55mm untuk lembar TTD
  if (currentY + 55 > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(12, 27, 22);
  doc.text("PENGESAHAN HASIL PEMERIKSAAN", marginX, currentY);

  doc.setDrawColor(0, 168, 118);
  doc.setLineWidth(0.6);
  doc.line(marginX, currentY + 1.5, marginX + 55, currentY + 1.5);

  currentY += 6;

  // Ekstrak Tanda Tangan
  const sigMap: Record<string, string> =
    result.signatureData && typeof result.signatureData === "object" ? result.signatureData : {};

  // Cari tanda tangan petugas & pengelola
  let petugasSig: string | null = sigMap.petugas || null;
  let pemilikSig: string | null = sigMap.pemilik || null;

  // Cek jika tersimpan dengan nama pertanyaan
  Object.entries(sigMap).forEach(([key, val]) => {
    if (!val || typeof val !== "string") return;
    const lower = key.toLowerCase();
    if (lower.includes("petugas") || lower.includes("pemeriksa") || lower.includes("sanitarian")) {
      petugasSig = val;
    } else if (lower.includes("pemilik") || lower.includes("pengelola") || lower.includes("sasaran")) {
      pemilikSig = val;
    } else if (!petugasSig) {
      petugasSig = val;
    }
  });

  // Cek juga dari values field tipe SIGNATURE
  (result.values || []).forEach((v: any) => {
    if (v.field?.tipe === "SIGNATURE" && v.valueString) {
      const q = (v.field.pertanyaan || "").toLowerCase();
      if (q.includes("pemilik") || q.includes("pengelola")) {
        pemilikSig = v.valueString;
      } else if (!petugasSig) {
        petugasSig = v.valueString;
      }
    }
  });

  const sigColW = (contentWidth - 16) / 2;
  const leftX = marginX;
  const rightX = marginX + sigColW + 16;
  const sigBoxH = 22;

  // ── Kolom Kiri: Pengelola / Pemilik Sasaran ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Mengetahui / Menyetujui,", leftX, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Pengelola / Penanggung Jawab Sasaran", leftX, currentY + 4.5);

  const sigPemilikY = currentY + 6;
  if (pemilikSig) {
    try {
      const pSigData = pemilikSig.startsWith("data:image/") ? pemilikSig : `data:image/png;base64,${pemilikSig}`;
      doc.addImage(pSigData, "PNG", leftX + 5, sigPemilikY, 48, sigBoxH);
    } catch {}
  } else {
    // Ruang kosong untuk paraf / stempel basah
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("(Tanda Tangan / Cap Usaha)", leftX + 10, sigPemilikY + sigBoxH / 2);
  }

  const namePemilikY = sigPemilikY + sigBoxH + 3;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(leftX, namePemilikY, leftX + sigColW, namePemilikY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(pengelolaSasaran !== "-" ? pengelolaSasaran : `( ${namaSasaran} )`, leftX, namePemilikY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Pemilik / Penanggung Jawab", leftX, namePemilikY + 8);

  // ── Kolom Kanan: Petugas Pemeriksa Kesehatan Lingkungan ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${puskesmasNama}, ${tanggalInspeksi}`, rightX, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Petugas Pemeriksa Kesling", rightX, currentY + 4.5);

  const sigPetugasY = currentY + 6;
  if (petugasSig) {
    try {
      const pSigData = petugasSig.startsWith("data:image/") ? petugasSig : `data:image/png;base64,${petugasSig}`;
      doc.addImage(pSigData, "PNG", rightX + 5, sigPetugasY, 48, sigBoxH);
    } catch {}
  }

  const namePetugasY = sigPetugasY + sigBoxH + 3;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(rightX, namePetugasY, rightX + sigColW, namePetugasY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(petugasNama, rightX, namePetugasY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sanitarian / Petugas Kesling ${puskesmasNama}`, rightX, namePetugasY + 8);

  // 9. Footer Otomatis di Setiap Halaman
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(marginX, 287, marginX + contentWidth, 287);

    doc.text(
      "Dokumen resmi diterbitkan melalui SIM-KESLING (Sistem Informasi Manajemen Kesehatan Lingkungan)",
      marginX,
      291,
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, marginX + contentWidth, 291, { align: "right" });
  }

  // Simpan File PDF
  const safeName = namaSasaran.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
  const filename = `berita-acara-ikl-${safeName}-${result.id}.pdf`;
  doc.save(filename);

  return { success: true, filename };
}
