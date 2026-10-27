/**
 * Ekstraksi foto dokumentasi dan tanda tangan dari sebuah hasil pemeriksaan.
 *
 * Keduanya dahulu hidup di dalam komponen modal (DetailResultModal, 1232 baris)
 * sehingga tidak dapat diuji. Batas antara keduanya penting: tanda tangan
 * tersimpan sebagai data-url di kolom yang sama dengan foto, jadi tanpa
 * penyaringan yang benar paraf petugas bocor ke galeri foto dokumentasi.
 */

import { photoSrc } from "./photo-url";

export type InspectionPhoto = { url: string; label?: string };
export type InspectionSignatures = { petugas: string | null; pemilik: string | null };

type ResultLike = any;

/** Kumpulkan semua nilai tanda tangan, apa pun bentuk penyimpanannya. */
function collectSignatureStrings(result: ResultLike, fields: any[]): Set<string> {
  const found = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value === "string" && value.trim()) found.add(value.trim());
  };

  const raw = result?.signatureData;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        Object.values(parsed).forEach(add);
      } else {
        add(raw);
      }
    } catch {
      add(raw);
    }
  } else if (raw && typeof raw === "object") {
    Object.values(raw).forEach(add);
  }

  for (const v of result?.values || []) {
    const field = v.field || fields.find((f: any) => f.id === v.fieldId);
    const tipe = String(field?.tipe || "").toUpperCase();
    const q = String(field?.pertanyaan || "").toLowerCase();
    const isSignature =
      tipe === "SIGNATURE" || tipe === "TTD" || q.includes("tanda tangan") || q.includes("ttd") || q.includes("paraf");
    if (isSignature) add(v.valueString);
  }

  return found;
}

function isSignatureField(field: any): boolean {
  const tipe = String(field?.tipe || "").toUpperCase();
  const q = String(field?.pertanyaan || "").toLowerCase();
  return (
    tipe === "SIGNATURE" || tipe === "TTD" || q.includes("tanda tangan") || q.includes("ttd") || q.includes("paraf")
  );
}

/**
 * Foto dokumentasi hasil pemeriksaan, sudah dibersihkan dari tanda tangan,
 * dinormalisasi, dan dibuang duplikatnya.
 */
export function extractInspectionPhotos(result: ResultLike, template?: any): InspectionPhoto[] {
  if (!result) return [];

  const fields = template?.fields || result.template?.fields || [];
  const signatureStrings = collectSignatureStrings(result, fields);
  const photos: InspectionPhoto[] = [];
  const seen = new Set<string>();

  // Data-url panjang tidak boleh dipakai sebagai key utuh (mahal), potongan
  // awalnya sudah cukup unik untuk membandingkan dua gambar basis64.
  const canonicalKey = (url: string) =>
    url.startsWith("data:image/") ? url.slice(0, 80) : url.split("?")[0].split("#")[0].toLowerCase().trim();

  const addPhoto = (raw: unknown, label?: string) => {
    if (!raw) return;

    if (Array.isArray(raw)) {
      raw.forEach((item, idx) => {
        addPhoto(item, label ? `${label} #${idx + 1}` : undefined);
      });
      return;
    }

    if (typeof raw === "object" && raw !== null) {
      Object.values(raw).forEach((val) => {
        addPhoto(val, label);
      });
      return;
    }

    if (typeof raw !== "string") return;

    const trimmed = raw.trim();
    if (!trimmed) return;

    // Nilai JSON yang tersimpan sebagai string (mis. daftar foto hasil multi-upload).
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          parsed.forEach((item, idx) => {
            addPhoto(item, label ? `${label} #${idx + 1}` : undefined);
          });
          return;
        }
        if (typeof parsed === "object" && parsed !== null) {
          Object.values(parsed).forEach((val) => {
            addPhoto(val, label);
          });
          return;
        }
      } catch {
        // Bukan JSON; perlakukan sebagai path biasa di bawah.
      }
    }

    // Tanda tangan tidak pernah masuk galeri foto.
    if (signatureStrings.has(trimmed)) return;

    const normalized = photoSrc(trimmed);
    if (!normalized) return;

    const key = canonicalKey(normalized);
    if (seen.has(key)) {
      // Label yang lebih spesifik menang atas label generic.
      const existing = photos.find((p) => canonicalKey(p.url) === key);
      if (label && existing?.label?.startsWith("Dokumentasi #")) existing.label = label;
      return;
    }

    seen.add(key);
    photos.push({ url: normalized, label: label || `Dokumentasi #${photos.length + 1}` });
  };

  // 1. Dari nilai kuesioner lebih dulu — labelnya (pertanyaan) lebih spesifik.
  for (const v of result.values || []) {
    const field = v.field || fields.find((f: any) => f.id === v.fieldId);
    if (isSignatureField(field)) continue;

    const valStr = typeof v.valueString === "string" ? v.valueString.trim() : "";
    if (!valStr || signatureStrings.has(valStr)) continue;

    const tipe = String(field?.tipe || "").toUpperCase();
    const isPhotoField = tipe === "PHOTO" || tipe === "FOTO" || tipe === "IMAGE" || tipe === "FILE";
    const looksLikeImage =
      valStr.includes("/uploads/") ||
      valStr.includes("uploads/") ||
      /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(valStr) ||
      valStr.startsWith("data:image/");

    if (isPhotoField || looksLikeImage) addPhoto(valStr, field?.pertanyaan || "Foto Dokumentasi");
  }

  // 2. Foto kegiatan lapangan tambahan.
  if (result.fotoPaths) addPhoto(result.fotoPaths, "Foto Kegiatan");

  return photos;
}

/** Tanda tangan petugas dan pengelola/pemilik, dipisah menurut nama fieldnya. */
export function extractInspectionSignatures(result: ResultLike, template?: any): InspectionSignatures {
  if (!result) return { petugas: null, pemilik: null };

  let map: Record<string, string> = {};
  const raw = result.signatureData;

  if (typeof raw === "string") {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  } else if (raw && typeof raw === "object") {
    map = raw;
  }

  let petugas: string | null = map.petugas || null;
  let pemilik: string | null = map.pemilik || null;

  for (const [key, val] of Object.entries(map)) {
    if (!val || typeof val !== "string") continue;
    const lower = key.toLowerCase();
    if (lower.includes("petugas") || lower.includes("pemeriksa") || lower.includes("sanitarian")) petugas = val;
    else if (lower.includes("pemilik") || lower.includes("pengelola") || lower.includes("sasaran")) pemilik = val;
    else if (!petugas) petugas = val;
  }

  const fields = template?.fields || result.template?.fields || [];
  for (const v of result.values || []) {
    const field = v.field || fields.find((f: any) => f.id === v.fieldId);
    const tipe = String(field?.tipe || "").toUpperCase();
    if ((tipe === "SIGNATURE" || tipe === "TTD") && v.valueString) {
      const q = String(field?.pertanyaan || "").toLowerCase();
      if (q.includes("pemilik") || q.includes("pengelola")) pemilik = v.valueString;
      else if (!petugas) petugas = v.valueString;
    }
  }

  return { petugas, pemilik };
}

/** Bentuk src yang aman untuk tanda tangan: data-url, path absolut, atau basis64 telanjang. */
export function signatureSrc(value: string): string {
  return value.startsWith("data:image/") || value.startsWith("/") || value.startsWith("http")
    ? value
    : `data:image/png;base64,${value}`;
}
