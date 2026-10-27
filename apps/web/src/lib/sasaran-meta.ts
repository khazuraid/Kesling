/**
 * Ambil nilai identitas sasaran (nama, alamat, pengelola, kontak) untuk
 * mengisi field kuesioner grup "__META__" dan kolom Sasaran.
 *
 * Sebagian besar data dasar sebenarnya disimpan di Sasaran.dataDinamis dengan
 * kode parameter sebagai key, bukan di kolom Sasaran. Kode itu tidak selalu
 * bisa ditebak — Laporan Builder membuatnya otomatis sebagai
 * "data_dasar_<timestamp>" — sehingga satu-satunya penghubung yang stabil
 * adalah nama/label fieldnya. Sebelumnya tidak ada yang membaca keduanya, jadi
 * kolom Sasaran.alamat/pemilik selalu kosong dan detail pemeriksaan menampilkan
 * "-" walau data dasarnya lengkap.
 */

export type BaselineKey = "nama" | "alamat" | "pemilik" | "kontak" | "lat" | "lng";

const ENTITY_KEYS: BaselineKey[] = ["nama", "alamat", "pemilik", "kontak", "lat", "lng"];

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

// Urutan penting: pemilik diperiksa sebelum "nama", karena label
// "Nama Pengelola / Penanggung Jawab" memuat keduanya. "lng" sebelum "lat",
// karena "Longitude GPS" memuat keduanya dan akan terbaca sebagai lat bila
// urutannya dibalik. "nama" paling akhir dan paling longgar supaya field
// bernama persis "Nama" ikut terbaca.
const KEY_BY_LABEL: { key: BaselineKey; re: RegExp }[] = [
  { key: "pemilik", re: /pemilik|pengelola|penanggung jawab/ },
  { key: "kontak", re: /kontak|telepon|telp|no[._ ]?hp|\bhp\b/ },
  { key: "lng", re: /longitude|bujur/ },
  { key: "lat", re: /latitude|lintang|\bgps\b|koordinat/ },
  { key: "alamat", re: /alamat|lokasi|tempat/ },
  { key: "nama", re: /nama/ },
];

// Kode lazim per field; sejalan dengan hydrateDynamicValues() di
// data-dasar/[categoryCode]. Dipakai saat nama field belum ada atau ambigu.
const CODE_BY_KEY: { key: BaselineKey; codes: string[] }[] = [
  { key: "pemilik", codes: ["pemilik", "pengelola", "nama_pemilik"] },
  { key: "kontak", codes: ["kontak", "telepon", "no_hp", "hp"] },
  { key: "alamat", codes: ["alamat", "alamat_lengkap"] },
  { key: "lat", codes: ["lat", "latitude"] },
  { key: "lng", codes: ["lng", "longitude"] },
  { key: "nama", codes: ["nama", "nama_sarana", "nama_tempat", "nama_usaha", "nama_sasaran"] },
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

/**
 * Field entitas mana yang diwakili sebuah parameter data dasar / field
 * template. Menerima keduanya: parameter memakai .nama, field template memakai
 * .pertanyaan. `syncToEntityField` yang dipilih operator selalu menang.
 */
export function baselineParamKey(param: any): BaselineKey | null {
  if (!param) return null;

  const explicit = String(param.config?.syncToEntityField ?? param.syncToEntityField ?? "").trim();
  if (explicit && (ENTITY_KEYS as string[]).includes(explicit)) return explicit as BaselineKey;

  const code = String(param.code ?? param.config?.dataDasarCode ?? "").toLowerCase();
  for (const { key, codes } of CODE_BY_KEY) {
    if (codes.includes(code)) return key;
  }

  const label = String(param.nama ?? param.pertanyaan ?? "").toLowerCase();
  for (const { key, re } of KEY_BY_LABEL) {
    if (re.test(label)) return key;
  }
  return null;
}

/**
 * Pasangkan field __META__ template dengan parameter data dasar kategorinya.
 * Dibutuhkan karena kode parameter (data_dasar_<timestamp>) tidak dapat
 * ditebak, sedangkan namanya bisa berbeda dari label fieldnya.
 *
 * Mengembalikan SEMUA kandidat, bukan yang pertama: satu kategori bisa punya
 * beberapa field ber-key sama ("Nama Pengelola" dan "Nama Pengelola /
 * Penanggung jawab — Username Telegram"), dan yang pertama belum tentu terisi.
 */
export function matchBaselineParams(field: any, params: any[] | undefined | null): any[] {
  if (!Array.isArray(params) || params.length === 0) return [];
  const cfg = field?.config || {};
  const picks: any[] = [];
  const seen = new Set<any>();

  const add = (hit: any) => {
    if (hit && !seen.has(hit)) {
      seen.add(hit);
      picks.push(hit);
    }
  };

  const code = String(cfg.dataDasarCode || cfg.parameterCode || "").trim();
  if (code) add(params.find((p: any) => String(p?.code ?? "") === code));

  const entity = String(field?.syncToEntityField || cfg.syncToEntityField || "").trim();
  if (entity) {
    for (const p of params) {
      if (String(p?.config?.syncToEntityField ?? p?.syncToEntityField ?? "") === entity) add(p);
    }
  }

  const key = baselineParamKey(field);
  if (key) {
    for (const p of params) {
      if (baselineParamKey(p) === key) add(p);
    }
  }

  return picks;
}

/** Kandidat pertama; dipakai saat satu parameter saja yang diperlukan. */
export function matchBaselineParam(field: any, params: any[] | undefined | null): any | null {
  return matchBaselineParams(field, params)[0] ?? null;
}

export function sasaranMetaValue(sasaran: SasaranLike, field: any, params?: any[] | null): string {
  if (!sasaran) return "";

  const dyn = (sasaran.dataDinamis ?? sasaran.dynamicValues ?? {}) as Record<string, unknown>;
  const fromDyn = (...codes: string[]) => {
    for (const code of codes) {
      const v = String(dyn?.[code] ?? "").trim();
      if (v) return v;
    }
    return "";
  };

  const cfg = field?.config || {};
  const autoFill = String(field?.autoFill || cfg.autoFill || "").trim();
  const key = baselineParamKey(field);

  // 1. Parameter yang benar-benar dipasangkan template (kode bisa apa saja),
  //    lalu kode yang ditunjuk eksplisit, lalu penanda autoFill, lalu kode
  //    lazim menurut key. Semuanya dicari sekaligus.
  const matched = matchBaselineParams(field, params).map((p: any) => String(p?.code ?? "").trim());
  const codes = [
    ...matched,
    cfg.dataDasarCode,
    cfg.parameterCode,
    ...(AUTOFILL_CODES[autoFill] || []),
    ...(CODE_BY_KEY.find((c) => c.key === key)?.codes || []),
  ]
    .map((c: unknown) => String(c ?? "").trim())
    .filter(Boolean);
  const hit = fromDyn(...codes);
  if (hit) return hit;

  // 2. Kolom Sasaran, untuk sasaran yang dibuat langsung (bukan lewat data dasar).
  if (key === "pemilik") return sasaran.pemilik || "";
  if (key === "kontak") return sasaran.kontak || "";
  if (key === "alamat") return sasaran.alamat || "";
  if (key === "lat" || key === "lng") {
    return sasaran.lat && sasaran.lng ? `${sasaran.lat},${sasaran.lng}` : "";
  }
  if (key === "nama") return sasaran.nama || "";

  // Label yang tak dikenal tidak boleh mengembalikan nilai sasaran apa pun.
  return "";
}

const DEFAULT_NAMES: Record<BaselineKey, string> = {
  nama: "Nama",
  alamat: "Alamat",
  pemilik: "Pemilik / Penanggung Jawab",
  kontak: "Kontak / Telepon",
  lat: "Latitude",
  lng: "Longitude",
};

/**
 * Nama field data dasar yang pasti dikenali baselineParamKey(). Field baru
 * memakai nama generik "Field Data Dasar Baru", yang tidak mengandung kata
 * kunci apa pun — jadi walaupun operator mengisinya, nilai itu tidak pernah
 * mengalir ke kolom Sasaran.
 */
export function defaultDataDasarNama(existing?: any[] | null): string {
  const used = new Set(
    (existing || [])
      .map((p: any) =>
        String(p?.nama ?? "")
          .trim()
          .toLowerCase(),
      )
      .filter(Boolean),
  );
  for (const key of ENTITY_KEYS) {
    if (!used.has(DEFAULT_NAMES[key].toLowerCase())) return DEFAULT_NAMES[key];
  }
  return "Field Data Dasar";
}

/** Kode unik untuk field data dasar baru; tetap data_dasar_<timestamp> agar cocok dengan data lama. */
export function defaultDataDasarCode(existing?: any[] | null): string {
  let code = `data_dasar_${Date.now()}`;
  let suffix = 1;
  const used = new Set((existing || []).map((p: any) => String(p?.code ?? "")));
  while (used.has(code)) {
    code = `data_dasar_${Date.now()}_${suffix++}`;
  }
  return code;
}

export type SasaranIdentity = {
  nama: string;
  alamat: string;
  pemilik: string;
  kontak: string;
  petugas: string;
  sarana: string;
  lat: number | null;
  lng: number | null;
};

/**
 * Nilai identitas dari field kuesioner bergrup __META__.
 *
 * Dibatasi ke grup itu agar butir checklist (mis. "Lokasi bebas dari
 * pencemaran") tidak tersalin jadi alamat. Jawaban boolean juga dibuang karena
 * field __META__ bisa berpasangan dengan penanda TRUE/FALSE.
 */
function pickMeta(values: any[], fields: any[], ...keys: string[]): string {
  for (const v of values || []) {
    const field = v?.field || fields.find((f: any) => f?.id === v?.fieldId);
    if (String(field?.grup ?? "") !== "__META__") continue;
    const q = String(field?.pertanyaan ?? "").toLowerCase();
    if (!keys.some((k) => q.includes(k))) continue;
    const text = String(v?.valueString ?? "").trim();
    if (!text || /^(TRUE|FALSE|NA)$/i.test(text)) continue;
    return text;
  }
  return "";
}

/**
 * Identitas sasaran untuk ditampilkan maupun dicetak, dari semua sumber yang
 * ada.
 *
 * Tiga sumber dipakai berurutan karena masing-masing pernah menjadi
 * satu-satunya yang terisi: kolom Sasaran, field __META__ template, dan nilai
 * data dasar di Sasaran.dataDinamis berkode data_dasar_<timestamp> (hasil
 * Laporan Builder, yang tidak pernah mengalir ke kolom Sasaran). Sebelumnya
 * urutan ini hidup terpisah di modal detail dan generator PDF, dan keduanya
 * berbeda — alamat yang sama bisa tampil lain di layar dan di berita acara.
 */
export function resolveSasaranIdentity(result: any, template?: any): SasaranIdentity {
  const fields = template?.fields || result?.template?.fields || [];
  const values = result?.values || [];
  const sasaran = result?.sasaran || null;
  const params = template?.dataDasarCategory?.parameters || template?.subCategory?.category?.parameters || [];
  const dyn = (label: string) => sasaranMetaValue(sasaran, { pertanyaan: label, config: {} }, params);

  const lat = Number(result?.lat ?? sasaran?.lat);
  const lng = Number(result?.lng ?? sasaran?.lng);

  return {
    nama:
      sasaran?.nama ||
      pickMeta(values, fields, "nama sarana", "unit sppg") ||
      dyn("nama sarana") ||
      result?.namaSasaran ||
      "",
    alamat:
      sasaran?.alamat ||
      pickMeta(values, fields, "alamat", "lokasi", "tempat") ||
      dyn("alamat") ||
      result?.alamatSasaran ||
      "",
    pemilik:
      sasaran?.pemilik ||
      pickMeta(values, fields, "pengelola", "penanggung jawab", "pemilik") ||
      dyn("pengelola") ||
      "",
    kontak: sasaran?.kontak || pickMeta(values, fields, "kontak", "telepon", "no hp") || dyn("kontak") || "",
    petugas: result?.user?.nama || pickMeta(values, fields, "petugas", "pemeriksa", "sanitarian") || "",
    sarana: sasaran?.subCategory?.nama || template?.subCategory?.nama || "",
    lat: Number.isFinite(lat) && lat !== 0 ? lat : null,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : null,
  };
}

/**
 * Isi kolom Sasaran dari field data dasar, memakai pemetaan key — bukan daftar
 * kode hardcoded. Tanpa ini field baseline bernama data_dasar_<timestamp> dari
 * Laporan Builder tidak pernah mengalir ke Sasaran.alamat/pemilik/pemilik, dan
 * seluruh tampilan riwayat jatuh ke "-".
 *
 * `form` adalah nilai kolom yang sudah ada di form, dipakai sebagai cadangan
 * agar entri lama tetap dapat disimpan walaupun field dynamicnya kosong.
 */
export function sasaranColumnsFromDynamic<T extends Record<string, any>>(
  dynamicValues: Record<string, unknown> | null | undefined,
  params: any[] | null | undefined,
  form?: T | null,
) {
  const pick = (key: BaselineKey, fallback = "") => {
    for (const p of params || []) {
      const isMapped = String(p?.config?.syncToEntityField ?? p?.syncToEntityField ?? "") === key;
      if (!isMapped && baselineParamKey(p) !== key) continue;
      const v = String(dynamicValues?.[p.code] ?? "").trim();
      if (v) return v;
    }
    return fallback;
  };

  const latRaw = pick("lat", form?.lat !== undefined && form?.lat !== null ? String(form.lat) : "");
  const lngRaw = pick("lng", form?.lng !== undefined && form?.lng !== null ? String(form.lng) : "");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  return {
    nama: pick("nama", String(form?.nama ?? "")),
    alamat: pick("alamat", String(form?.alamat ?? "")),
    pemilik: pick("pemilik", String(form?.pemilik ?? "")),
    kontak: pick("kontak", String(form?.kontak ?? "")),
    lat: latRaw && Number.isFinite(lat) ? lat : null,
    lng: lngRaw && Number.isFinite(lng) ? lng : null,
  };
}
