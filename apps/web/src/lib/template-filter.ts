/**
 * Penyaringan daftar template pemeriksaan.
 *
 * Dipakai bersama oleh tab Formulir di /pemeriksaan dan daftar di
 * /form-pemeriksaan. Sebelumnya logika pemilik ditulis dua kali dengan
 * bentuk yang sedikit berbeda; menyatukannya di sini membuat keduanya
 * berperilaku sama dan bisa diuji tanpa merender apa pun.
 *
 * Catatan penting: ini murni saringan TAMPILAN. Penguncian wilayah yang
 * sesungguhnya ada di API (/api/inspection/results dan /api/sasaran), bukan
 * di sini — daftar template memang sengaja terlihat lintas puskesmas.
 */

/** Nilai yang sah untuk filter pemilik template. */
export type TemplateOwner = "all" | "dinkes" | "own" | "other";

/**
 * Pemilik template ditentukan dari puskesmasId:
 * - null/undefined  -> Dinkes (template pusat, terlihat semua puskesmas)
 * - sama dengan pkm -> Puskesmas sendiri
 * - berbeda         -> Puskesmas lain
 */
export function matchesTemplateOwner(
  template: { puskesmasId?: number | null },
  owner: string,
  ownPuskesmasId: number | null | undefined,
): boolean {
  if (owner === "all" || !owner) return true;
  const tplPkm = template?.puskesmasId ?? null;
  if (owner === "dinkes") return !tplPkm;
  if (owner === "own") return Boolean(tplPkm) && tplPkm === ownPuskesmasId;
  if (owner === "other") return Boolean(tplPkm) && tplPkm !== ownPuskesmasId;
  return true;
}

/** Nama kategori template: subCategory.category.nama, jatuh ke subCategory.nama. */
export function templateCategoryName(template: any): string {
  return template?.subCategory?.category?.nama || template?.subCategory?.nama || "";
}

/** Daftar kategori unik dari sekumpulan template, terurut. */
export function templateCategoryOptions(templates: any[]): string[] {
  const seen = new Set<string>();
  for (const t of templates || []) {
    const nama = templateCategoryName(t);
    if (nama) seen.add(nama);
  }
  return Array.from(seen).sort();
}

/** Cocokkan template dengan kata kunci pada nama, deskripsi, dan sub-kategori. */
export function matchesTemplateSearch(template: any, query: string): boolean {
  const q = (query || "").toLowerCase().trim();
  if (!q) return true;
  return (
    (template?.nama || "").toLowerCase().includes(q) ||
    (template?.deskripsi || "").toLowerCase().includes(q) ||
    (template?.subCategory?.nama || "").toLowerCase().includes(q)
  );
}

/**
 * Susun query param riwayat pemeriksaan dari state filter halaman.
 * Hanya filter yang benar-benar terpasang yang dikirim, supaya URL tetap
 * pendek dan cache React Query tidak terpecah oleh nilai kosong.
 */
export function buildRiwayatParams(filters: {
  page: number;
  limit: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  templateId?: string;
  userId?: string;
}): URLSearchParams {
  const sp = new URLSearchParams({
    paginated: "1",
    page: String(filters.page),
    limit: String(filters.limit),
    search: (filters.search || "").trim(),
  });
  if (filters.dateFrom) sp.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) sp.set("dateTo", filters.dateTo);
  if (filters.status && filters.status !== "all") sp.set("status", filters.status);
  if (filters.templateId && filters.templateId !== "all") sp.set("templateId", filters.templateId);
  if (filters.userId && filters.userId !== "all") sp.set("userId", filters.userId);
  return sp;
}
