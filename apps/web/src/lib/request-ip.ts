// Menerima NextRequest (punya .headers) maupun ReadonlyHeaders langsung dari
// headers() — dilihat dari bentuknya, bukan tipe nominalnya.
type HeaderSource = { headers: { get(name: string): string | null } } | { get(name: string): string | null };

function headerGetter(req: HeaderSource) {
  return "headers" in req ? req.headers : req;
}

/**
 * IP klien untuk rate limit & security log.
 *
 * `x-forwarded-for` bisa dipalsukan klien dengan cara *menambah* entri di depan,
 * jadi entri paling KIRI tidak dapat dipercaya. Entri paling KANAN adalah yang
 * ditambahkan proxy kita sendiri. Cloudflare menulis `cf-connecting-ip` di luar
 * rantai itu, jadi dipakai lebih dulu bila ada.
 */
export function clientIp(req: HeaderSource): string {
  const h = headerGetter(req);

  const cf = h.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();

  const xff = h.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }

  return h.get("x-real-ip")?.trim() || "unknown";
}
