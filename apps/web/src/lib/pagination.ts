export function getPaginationParams(searchParams: URLSearchParams, defaultLimit = 50) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function paginatedResponse(data: any[], total: number, page: number, limit: number) {
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Nomor halaman yang ditampilkan, dengan elipsis bila halamannya banyak.
 * Mengembalikan `null` sebagai penanda elipsis supaya pemanggilnya bebas
 * memilih ikon. Tanpa ini tombol halaman dirender satu per satu dan barisnya
 * meluber begitu jumlah halaman lewat belasan.
 */
export function pageWindow(current: number, totalPages: number, siblings = 1): (number | null)[] {
  const total = Math.max(1, Math.floor(totalPages));
  const active = Math.min(Math.max(1, Math.floor(current)), total);
  const maxSlots = siblings * 2 + 5; // pertama, terakhir, aktif, 2 elipsis

  if (total <= maxSlots) return Array.from({ length: total }, (_, i) => i + 1);

  const left = Math.max(active - siblings, 2);
  const right = Math.min(active + siblings, total - 1);
  const ellipsis = null;
  const pages: (number | null)[] = [1];
  // Ada celah di kiri/kanan aktif → sisipkan elipsis, kalau tidak nomornya
  // berurutan dan elipsis hanya jadi noise.
  if (left > 2) pages.push(ellipsis);
  for (let p = left; p <= right; p += 1) pages.push(p);
  if (right < total - 1) pages.push(ellipsis);
  pages.push(total);
  return pages;
}

/** Rentang data yang sedang tampil, mis. `1–10 dari 248`. */
export function pageRange(page: number, limit: number, total: number) {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (Math.max(1, page) - 1) * limit + 1;
  return { from, to: Math.min(from + limit - 1, total) };
}
