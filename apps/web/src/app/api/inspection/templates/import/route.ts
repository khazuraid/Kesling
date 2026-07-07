import mammoth from "mammoth";
import { type NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { withAuth } from "@/lib/api-auth";

type ImportedField = {
  pertanyaan: string;
  tipe?: string;
  isRequired?: boolean;
  grup?: string;
  skor?: number;
  skorBenar?: number;
  skorSalah?: number;
  options?: string[];
  config?: Record<string, unknown>;
};

type ImportedTemplate = {
  nama: string;
  deskripsi?: string;
  fields: ImportedField[];
  source?: "ai" | "local";
};

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();

    let text = "";
    if (fileName.endsWith(".pdf")) {
      text = await extractPdfText(buffer);
    } else if (fileName.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || "";
    } else if (fileName.endsWith(".doc")) {
      return NextResponse.json(
        { error: "Format .doc lama belum didukung. Simpan ulang file Word menjadi .docx lalu import lagi." },
        { status: 400 },
      );
    } else {
      return NextResponse.json({ error: "Format file harus .pdf atau .docx" }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Teks tidak dapat diekstrak. Jika PDF hasil scan, perlu OCR terlebih dahulu." },
        { status: 400 },
      );
    }

    const local = localNormalize(text, file.name);
    const ai = await aiNormalize(text, file.name, local).catch((error) => {
      console.warn("[Import Template AI Fallback]", error);
      return null;
    });

    const result = sanitizeTemplate(ai || local, file.name);
    return NextResponse.json({
      ...result,
      source: ai ? "ai" : "local",
      deskripsi: `${result.deskripsi || `Diimpor dari file ${file.name}`} (${result.fields.length} butir, ${ai ? "AI normalizer" : "parser lokal"})`,
    });
  } catch (e: any) {
    console.error("[Import Template Error]", e);
    return NextResponse.json({ error: `Gagal memproses file: ${e.message}` }, { status: 500 });
  }
});

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

function localNormalize(text: string, fileName: string): ImportedTemplate {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentGrup = "Umum";
  const fields: Array<{ pertanyaan: string; grup: string; skor: number }> = [];
  let title = fileName.replace(/\.(pdf|docx?)$/i, "").replace(/[_-]/g, " ");

  for (let i = 0; i < Math.min(12, rawLines.length); i++) {
    const line = rawLines[i];
    const upper = line.toUpperCase();
    if (
      upper.includes("FORMULIR") ||
      upper.includes("PEMERIKSAAN") ||
      upper.includes("INSPEKSI") ||
      upper.includes("CHECKLIST") ||
      upper.includes("IKL")
    ) {
      title = line;
      if (rawLines[i + 1] && rawLines[i + 1].length < 80 && !rawLines[i + 1].includes(":"))
        title += ` ${rawLines[i + 1]}`;
      break;
    }
  }

  const questionStartRegex = /^(?:(\d+)[.)]?|([a-z])[.)])\s+(.+)/i;
  let currentQuestion: { pertanyaan: string; grup: string; skor: number } | null = null;

  for (const originalLine of rawLines) {
    const line = originalLine.replace(/\s+/g, " ").trim();
    const lower = line.toLowerCase();

    if (line.includes("……") || line.includes("____")) continue;
    if (/^(nama|alamat|nomor|tanggal|jumlah|tipe)\b/i.test(line)) continue;
    if (
      lower.includes("kriteria penilaian") ||
      lower.includes("lingkari pada nilai") ||
      /^(gol\s*a|gol\s*b|gol\s*c|no|variabel|bobot|hasil|nilai|keterangan)$/i.test(line)
    )
      continue;

    if (isLikelyGroup(line)) {
      if (currentQuestion) fields.push(currentQuestion);
      currentQuestion = null;
      currentGrup = cleanGroup(line);
      continue;
    }

    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      if (currentQuestion) fields.push(currentQuestion);
      let qText = qMatch[3].trim();
      const score = extractTrailingScore(qText);
      qText = score.text;
      if (qMatch[2] && fields.length > 0 && fields[fields.length - 1].pertanyaan.endsWith(":")) {
        qText = `${fields[fields.length - 1].pertanyaan.replace(/:$/, "")} — ${qText}`;
      }
      currentQuestion = { pertanyaan: qText, grup: currentGrup, skor: score.skor };
      continue;
    }

    if (currentQuestion && line.length > 2 && !/^\d+$/.test(line)) {
      const score = extractTrailingScore(line);
      currentQuestion.skor = score.skor || currentQuestion.skor;
      if (score.text.length > 1) currentQuestion.pertanyaan += ` ${score.text}`;
    }
  }

  if (currentQuestion) fields.push(currentQuestion);

  return {
    nama: title.trim(),
    deskripsi: `Diimpor dari file ${fileName}`,
    fields: fields.map((field) => ({
      pertanyaan: field.pertanyaan.replace(/\s+/g, " ").trim(),
      tipe: "BOOLEAN",
      isRequired: false,
      grup: field.grup || "Umum",
      skor: field.skor || 1,
      skorBenar: field.skor || 1,
      skorSalah: 0,
    })),
    source: "local",
  };
}

function isLikelyGroup(line: string) {
  if (line.length < 3 || line.length > 90) return false;
  if (/\d\s+\d\s+\d$/.test(line)) return false;
  if (/^(inspeksi|area|bagian)\b/i.test(line)) return true;
  if (/^[A-Z][.)]?\s+[A-Z][A-Za-z\s/&-]{2,}$/.test(line)) return true;
  if (/^[IVXLCDM]+[.)]\s+[A-Z]/i.test(line)) return true;
  if (line === line.toUpperCase() && !/[?:]/.test(line) && !/^\d/.test(line)) return true;
  return false;
}

function cleanGroup(line: string) {
  return line
    .replace(/^[A-Z][.)]?\s+/, "")
    .replace(/^[IVXLCDM]+[.)]\s+/i, "")
    .trim();
}

function extractTrailingScore(text: string) {
  let clean = text.trim();
  let skor = 1;
  const match = clean.match(/\s+((?:NA|\d)(?:\s+(?:NA|\d)){0,3})$/i);
  if (match) {
    const numeric = match[1]
      .split(/\s+/)
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (numeric.length > 0) skor = numeric[0];
    clean = clean.slice(0, match.index).trim();
  }
  clean = clean.replace(/[._]{2,}$/g, "").trim();
  return { text: clean, skor };
}

async function aiNormalize(
  text: string,
  fileName: string,
  fallback: ImportedTemplate,
): Promise<ImportedTemplate | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openRouterKey && !openAiKey) return null;

  const prompt = buildPrompt(text, fileName, fallback);
  const endpoint = openRouterKey
    ? "https://openrouter.ai/api/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
  const model = openRouterKey
    ? process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini"
    : process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterKey || openAiKey}`,
      ...(openRouterKey
        ? { "HTTP-Referer": process.env.NEXTAUTH_URL || "https://kesling.biz.id", "X-Title": "Kesling Cirebon" }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Anda adalah normalizer dokumen inspeksi kesehatan lingkungan. Kembalikan hanya JSON valid. Jangan menambah pertanyaan yang tidak ada di dokumen.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`AI normalizer gagal: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI tidak mengembalikan konten");
  return JSON.parse(stripJsonFence(content));
}

function buildPrompt(text: string, fileName: string, fallback: ImportedTemplate) {
  const clippedText = text.slice(0, 45000);
  const fallbackPreview = JSON.stringify({ nama: fallback.nama, fields: fallback.fields.slice(0, 20) }, null, 2);
  return `
File: ${fileName}

Tugas:
Ubah isi dokumen ini menjadi JSON template form pemeriksaan untuk aplikasi Kesling.

Skema output wajib:
{
  "nama": "string",
  "deskripsi": "string",
  "fields": [
    {
      "grup": "string",
      "pertanyaan": "string",
      "tipe": "BOOLEAN|TEXT|NUMBER|DATE|SELECT|PHOTO|SIGNATURE|GPS",
      "isRequired": false,
      "skor": number,
      "skorBenar": number,
      "skorSalah": 0,
      "options": []
    }
  ]
}

Aturan:
- Jangan mengarang butir pertanyaan. Ambil hanya yang ada pada dokumen.
- Deteksi grup/bab seperti Lokasi, Bangunan, Fasilitas, Sanitasi, Penjamah, dll.
- Untuk checklist MS/TMS atau nilai Gol A/B/C, gunakan tipe BOOLEAN.
- Jika ada skor/bobot di kanan baris, masukkan ke skor dan skorBenar. Jika banyak skor Gol A/B/C, pakai angka pertama yang valid sebagai default.
- Jika dokumen punya sub-butir a/b/c, boleh jadikan pertanyaan tersendiri dan gabungkan dengan induknya bila perlu.
- Output harus JSON valid tanpa markdown.

Preview parser lokal sebagai pembanding:
${fallbackPreview}

Teks hasil ekstraksi dokumen:
${clippedText}`;
}

function stripJsonFence(content: string) {
  return content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function sanitizeTemplate(template: ImportedTemplate, fileName: string): ImportedTemplate {
  const fields = Array.isArray(template.fields) ? template.fields : [];
  const cleanFields = fields
    .filter((field) => field?.pertanyaan && String(field.pertanyaan).trim().length > 2)
    .map((field) => {
      const skor = Number(field.skor ?? field.skorBenar ?? 1) || 1;
      return {
        pertanyaan: String(field.pertanyaan).replace(/\s+/g, " ").trim(),
        tipe: normalizeType(field.tipe),
        isRequired: Boolean(field.isRequired),
        grup: String(field.grup || "Umum").trim(),
        skor,
        skorBenar: Number(field.skorBenar ?? skor) || skor,
        skorSalah: Number(field.skorSalah ?? 0) || 0,
        options: Array.isArray(field.options) ? field.options : undefined,
        config: field.config || undefined,
      };
    });

  if (cleanFields.length === 0) {
    cleanFields.push({
      pertanyaan: "Dokumen berhasil dibaca, tetapi butir pemeriksaan belum terdeteksi. Silakan koreksi manual.",
      tipe: "TEXT",
      isRequired: false,
      grup: "Umum",
      skor: 0,
      skorBenar: 0,
      skorSalah: 0,
      options: undefined,
      config: undefined,
    });
  }

  return {
    nama: String(template.nama || fileName.replace(/\.(pdf|docx?)$/i, "")).trim(),
    deskripsi: template.deskripsi || `Diimpor dari file ${fileName}`,
    fields: cleanFields,
    source: template.source,
  };
}

function normalizeType(type?: string) {
  const value = String(type || "BOOLEAN").toUpperCase();
  const allowed = new Set(["BOOLEAN", "TEXT", "NUMBER", "DATE", "SELECT", "PHOTO", "SIGNATURE", "GPS"]);
  return allowed.has(value) ? value : "BOOLEAN";
}
