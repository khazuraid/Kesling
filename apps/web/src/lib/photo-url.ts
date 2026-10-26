/**
 * Normalisasi nilai foto dari database menjadi src yang bisa dimuat browser.
 *
 * Nilai di DB datang dalam beberapa bentuk tergantung versi aplikasi yang
 * menulisnya: `/uploads/...`, `public/uploads/...`, path tanpa garis miring
 * depan, URL absolut ke domain sendiri, data URL, atau kumpulan beberapa
 * nilai (array / JSON string / dipisah koma).
 *
 * URL absolut ke domain sendiri HARUS dipangkas jadi path relatif: kalau
 * tidak, permintaan lewat optimizer gambar dijawab 400. Domain lain
 * dibiarkan apa adanya (gambar eksternal tetap bisa dimuat).
 */
const OWN_HOSTS = new Set(["kesling.biz.id", "www.kesling.biz.id"]);

function ownHost(host: string): boolean {
  if (OWN_HOSTS.has(host)) return true;
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      if (new URL(configured).host === host) return true;
    } catch {
      // env tidak valid — abaikan
    }
  }
  return typeof window !== "undefined" && window.location.host === host;
}

export function photoSrc(raw: unknown): string | null {
  const candidates: string[] = [];

  const walk = (val: unknown, depth = 0) => {
    if (depth > 4 || val === null || val === undefined) return;
    if (Array.isArray(val)) {
      val.forEach((v) => {
        walk(v, depth + 1);
      });
      return;
    }
    if (typeof val === "object") {
      Object.values(val as Record<string, unknown>).forEach((v) => {
        walk(v, depth + 1);
      });
      return;
    }
    const s = String(val).trim();
    if (!s) return;
    // Data URL memuat koma di dalam payload base64 — jangan dipecah.
    if (s.startsWith("data:")) {
      candidates.push(s);
      return;
    }
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        walk(JSON.parse(s), depth + 1);
        return;
      } catch {
        // bukan JSON — perlakukan sebagai teks biasa
      }
    }
    for (const part of s.split(",")) candidates.push(part.trim());
  };

  walk(raw);

  const hit = candidates.find((c) => {
    if (!c || c === "-" || c === "null" || c === "undefined" || c === "[]" || c === "{}") return false;
    if (c.startsWith("data:image/")) return true;
    if (/^https?:\/\//i.test(c)) return true;
    return c.includes("uploads/") || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(c);
  });
  if (!hit) return null;

  if (hit.startsWith("data:")) return hit;

  if (/^https?:\/\//i.test(hit)) {
    let u: URL;
    try {
      u = new URL(hit);
    } catch {
      return null;
    }
    if (!ownHost(u.host)) return hit;
    return `/${u.pathname.replace(/^\/+/, "")}${u.search}`;
  }

  return `/${hit
    .replace(/\\/g, "/")
    .replace(/^\/?public\//, "")
    .replace(/^\/+/, "")}`;
}
