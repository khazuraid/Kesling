/**
 * Ambil nilai identitas sasaran (alamat, pengelola, kontak, nama) untuk
 * mengisi field kuesioner grup "__META__".
 *
 * Sebagian besar data dasar sebenarnya disimpan di Sasaran.dataDinamis dengan
 * kode parameter sebagai key ("alamat", "pemilik", "nama", ...), bukan di
 * kolom Sasaran. Field template juga bisa menunjuk kode secara eksplisit lewat
 * config.dataDasarCode. Sebelumnya tidak ada yang membaca keduanya, sehingga
 * field alamat/pengelola dibiarkan kosong dan tampil "-" di detail pemeriksaan.
 */

type SasaranLike =
  | {
      nama?: string | null;
      alamat?: string | null;
      pemilik?: string | null;
      kontak?: string | null;
      lat?: number | null;
      lng?: number | null;
      dataDinamis?: unknown;
      dynamicValues?: unknown;
    }
  | null
  | undefined;

// Kode lazim per label pertanyaan; sejalan dengan hydrateDynamicValues() di
// data-dasar/[categoryCode]. Urutan penting: pemilik diperiksa sebelum "nama",
// karena label "Nama Pengelola / Penanggung Jawab" memuat keduanya.
const CODE_BY_LABEL: { keys: string[]; codes: string[] }[] = [
  { keys: ["pemilik", "pengelola", "penanggung jawab"], codes: ["pemilik", "pengelola", "nama_pemilik"] },
  { keys: ["kontak", "telepon", "telp", "no hp", "no_hp", "hp"], codes: ["kontak", "telepon", "no_hp", "hp"] },
  { keys: ["alamat", "lokasi"], codes: ["alamat", "alamat_lengkap"] },
  { keys: ["latitude", "lintang"], codes: ["lat", "latitude"] },
  { keys: ["longitude", "bujur"], codes: ["lng", "longitude"] },
  {
    keys: ["nama tempat", "nama sarana", "nama usaha", "nama unit", "nama sasaran", "nama objek"],
    codes: ["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"],
  },
];

// Penanda autoFill bawaan template lama. Nilai ini diisi di builder form
// (form-pemeriksaan) tetapi tidak pernah dibaca di runtime — di sini artinya
// didefinisikan sebagai kode data dasar yang ditunjuk.
const AUTOFILL_CODES: Record<string, string[]> = {
  SASARAN_NAMA: ["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"],
  SASARAN_ALAMAT: ["alamat", "alamat_lengkap"],
  SASARAN_PEMILIK: ["pemilik", "pengelola", "nama_pemilik"],
  SASARAN_KONTAK: ["kontak", "telepon", "no_hp", "hp"],
  SASARAN_LAT: ["lat", "latitude"],
  SASARAN_LNG: ["lng", "longitude"],
};

export function sasaranMetaValue(sasaran: SasaranLike, field: any): string {
  if (!sasaran) return "";

  const dyn = (sasaran.dataDinamis ?? sasaran.dynamicValues ?? {}) as Record<string, unknown>;
  const fromDyn = (...codes: string[]) => {
    for (const code of codes) {
      const v = String(dyn?.[code] ?? "").trim();
      if (v) return v;
    }
    return "";
  };

  // 1. Kode yang ditunjuk template — paling tepat, tidak perlu menebak label.
  const cfg = field?.config || {};
  const autoFill = String(field?.autoFill || cfg.autoFill || "").trim();
  const explicit = [cfg.dataDasarCode, cfg.parameterCode, ...(AUTOFILL_CODES[autoFill] || [])]
    .map((c: unknown) => String(c ?? "").trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    const hit = fromDyn(...explicit);
    if (hit) return hit;
  }

  const q = String(field?.pertanyaan || "").toLowerCase();

  // 2. Kode lazim menurut label.
  for (const { keys, codes } of CODE_BY_LABEL) {
    if (!keys.some((k) => q.includes(k))) continue;
    const hit = fromDyn(...codes);
    if (hit) return hit;
    break;
  }

  // 3. Kolom Sasaran, untuk sasaran yang dibuat langsung (bukan lewat data dasar).
  if (/pemilik|pengelola|penanggung jawab/.test(q)) return sasaran.pemilik || "";
  if (/kontak|telepon|telp|no_hp|no hp|\bhp\b/.test(q)) return sasaran.kontak || "";
  if (/alamat|lokasi/.test(q)) return sasaran.alamat || "";
  if (/gps|koordinat/.test(q) && sasaran.lat && sasaran.lng) return `${sasaran.lat},${sasaran.lng}`;
  if (q.includes("nama") && /sarana|tempat|usaha|unit|sasaran/.test(q)) return sasaran.nama || "";
  return "";
}
