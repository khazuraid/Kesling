"use strict";

function normalizeInspectionTemplate(text, fileName) {
  const rawLines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tableFields = parseDoclingMarkdownTables(rawLines);
  let title = fileName.replace(/\.(pdf|docx?)$/i, "").replace(/[_-]/g, " ");
  for (let i = 0; i < Math.min(12, rawLines.length); i++) {
    const line = rawLines[i];
    const upper = line.toUpperCase();
    if (["FORMULIR", "PEMERIKSAAN", "INSPEKSI", "CHECKLIST", "IKL"].some((value) => upper.includes(value))) {
      title = line.replace(/^#+\s*/, "").trim();
      if (rawLines[i + 1] && rawLines[i + 1].length < 80 && !rawLines[i + 1].includes(":"))
        title += ` ${rawLines[i + 1].replace(/^#+\s*/, "").trim()}`;
      break;
    }
  }

  let fields;
  if (tableFields.length) fields = tableFields;
  else {
    let currentGrup = "Umum";
    fields = [];
    const questionStartRegex = /^(?:(\d+)[.)]?|([a-z])[.)])\s+(.+)/i;
    let currentQuestion = null;
    for (const originalLine of rawLines) {
      const line = originalLine.replace(/\s+/g, " ").trim();
      const lower = line.toLowerCase();
      if (line.includes("……") || line.includes("____")) continue;
      if (/^(nama|alamat|nomor|tanggal|jumlah|tipe)\b/i.test(line)) continue;
      if (lower.includes("kriteria penilaian") || lower.includes("lingkari pada nilai") || /^(gol\s*a|gol\s*b|gol\s*c|no|variabel|bobot|hasil|nilai|keterangan)$/i.test(line)) continue;
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
        if (qMatch[2] && fields.length && fields[fields.length - 1].pertanyaan.endsWith(":"))
          qText = `${fields[fields.length - 1].pertanyaan.replace(/:$/, "")} — ${qText}`;
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
  }

  return sanitizeTemplate({
    nama: title.trim(), deskripsi: `Diimpor dari file ${fileName}`,
    fields: fields.map((field) => ({ pertanyaan: field.pertanyaan, tipe: "BOOLEAN", isRequired: false,
      grup: field.grup || "Umum", skor: field.skor || 1, skorBenar: field.skor || 1, skorSalah: 0 })), source: "local",
  }, fileName);
}

function parseDoclingMarkdownTables(lines) {
  const fields = []; let area = "Umum"; let section = "Umum"; let parent = "";
  for (const line of lines) {
    if (!line.startsWith("|") || /^\|[\s:|-]+\|?$/.test(line)) continue;
    const cells = line.slice(1, line.endsWith("|") ? -1 : undefined).split("|").map((cell) => cell.trim().replace(/\s+/g, " "));
    if (cells.length < 3) continue;
    const meaningful = cells.filter(Boolean); if (!meaningful.length) continue;
    const joined = meaningful.join(" ").toLowerCase();
    if (joined.includes("kriteria penilaian") || joined.includes("lingkari pada nilai") || meaningful.every((cell) => /^(?:no|gol(?:\s*[abc])?|variabel|komponen|nilai|bobot|NA|\d+)$/i.test(cell))) continue;
    const first = cells[0] || ""; const second = cells[1] || ""; const third = cells[2] || "";
    const scoreCells = cells.slice(3).filter((cell) => /^(?:NA|\d+)$/i.test(cell)); const hasScore = scoreCells.length > 0;
    if (!hasScore && meaningful.every((cell) => cell.toLowerCase() === meaningful[0].toLowerCase())) {
      const label = meaningful[0].replace(/^#+\s*/, "").trim();
      if (/^inspeksi\s+area\b/i.test(label)) { area = label; section = "Umum"; }
      else if (label.length > 2) section = label;
      parent = ""; continue;
    }
    if (/^[A-Z]$/i.test(first) && !hasScore) { section = (third || second || section).replace(/^#+\s*/, "").trim(); parent = ""; continue; }
    let question = third || second; if (!question || /^(?:NA|\d+)$/i.test(question)) continue;
    const marker = second.match(/^([a-z])[.)]?\s*(.*)$/i);
    if (marker && marker[2].length <= 2 && third) question = third; else if (/^[a-z][.)]?$/i.test(second) && third) question = third;
    if (!hasScore) { parent = question.replace(/:$/, "").trim(); continue; }
    if (parent && (/^[a-z][.)]?$/i.test(second) || /^[a-z][.)]\s+/i.test(second))) question = `${parent} — ${question}`;
    question = question.replace(/^[a-z][.)]\s*/i, "").trim(); if (question.length < 3) continue;
    const skor = scoreCells.map(Number).find((n) => Number.isFinite(n) && n > 0) || 1;
    fields.push({ pertanyaan: question, grup: [area, section].filter(Boolean).join(" — "), skor });
  }
  const seen = new Set();
  return fields.filter((field) => { const key = `${field.grup}|${field.pertanyaan}`.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}
function isLikelyGroup(line) {
  if (line.length < 3 || line.length > 90 || /\d\s+\d\s+\d$/.test(line)) return false;
  return /^(inspeksi|area|bagian)\b/i.test(line) || /^[A-Z][.)]?\s+[A-Z][A-Za-z\s/&-]{2,}$/.test(line) || /^[IVXLCDM]+[.)]\s+[A-Z]/i.test(line) || (line === line.toUpperCase() && !/[?:]/.test(line) && !/^\d/.test(line));
}
function cleanGroup(line) { return line.replace(/^[A-Z][.)]?\s+/, "").replace(/^[IVXLCDM]+[.)]\s+/i, "").trim(); }
function extractTrailingScore(text) {
  let clean = text.trim(); let skor = 1; const match = clean.match(/\s+((?:NA|\d)(?:\s+(?:NA|\d)){0,3})$/i);
  if (match) { const numeric = match[1].split(/\s+/).map(Number).filter((v) => Number.isFinite(v) && v > 0); if (numeric.length) skor = numeric[0]; clean = clean.slice(0, match.index).trim(); }
  return { text: clean.replace(/[._]{2,}$/g, "").trim(), skor };
}
function sanitizeTemplate(template, fileName) {
  const fields = (Array.isArray(template.fields) ? template.fields : []).filter((field) => field && field.pertanyaan && String(field.pertanyaan).trim().length > 2).map((field) => {
    const skor = Number(field.skor ?? field.skorBenar ?? 1) || 1;
    return { pertanyaan: String(field.pertanyaan).replace(/\s+/g, " ").trim(), tipe: normalizeType(field.tipe), isRequired: Boolean(field.isRequired), grup: String(field.grup || "Umum").trim(), skor, skorBenar: Number(field.skorBenar ?? skor) || skor, skorSalah: Number(field.skorSalah ?? 0) || 0, options: Array.isArray(field.options) ? field.options : undefined, config: field.config || undefined };
  });
  if (!fields.length) fields.push({ pertanyaan: "Dokumen berhasil dibaca, tetapi butir pemeriksaan belum terdeteksi. Silakan koreksi manual.", tipe: "TEXT", isRequired: false, grup: "Umum", skor: 0, skorBenar: 0, skorSalah: 0, options: undefined, config: undefined });
  return { nama: String(template.nama || fileName.replace(/\.(pdf|docx?)$/i, "")).trim(), deskripsi: template.deskripsi || `Diimpor dari file ${fileName}`, fields, source: template.source };
}
function normalizeType(type) { const value = String(type || "BOOLEAN").toUpperCase(); return new Set(["BOOLEAN", "TEXT", "NUMBER", "DATE", "SELECT", "PHOTO", "SIGNATURE", "GPS"]).has(value) ? value : "BOOLEAN"; }
module.exports = { normalizeInspectionTemplate };
