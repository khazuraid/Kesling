/**
 * Ambil JSON dari API dan jamin bentuknya.
 *
 * `fetch(...).then((r) => r.json())` tanpa memeriksa status mengembalikan isi
 * jawaban error (mis. `{ error: "Forbidden" }`) seolah-olah itu datanya. Di
 * pemanggil yang langsung memakai `.map()`/`.filter()`, satu jawaban 403 atau
 * 500 cukup untuk membuat seluruh halaman menjadi layar error. Helper ini
 * melempar error sehingga React Query menandai query gagal, dan nilai awal
 * (array kosong) tetap dipakai.
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`GET ${url} gagal (${res.status})`);
  }
  return (await res.json()) as T;
}

/** Varian untuk endpoint yang boleh gagal (polling, widget opsional). */
export async function fetchJsonOr<T>(url: string, fallback: T, init?: RequestInit): Promise<T> {
  try {
    return await fetchJson<T>(url, init);
  } catch {
    return fallback;
  }
}
