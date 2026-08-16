import { prisma } from "@apps-kes/database";

// ponytail: cache 1 jam. Upgrade: Redis jika multi-instance.
let cache: { year: number; data: LiburInfo[]; ts: number } | null = null;
const CACHE_MS = 60 * 60 * 1000;

export interface LiburInfo {
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  sumber: "nasional" | "custom" | "minggu";
}

// Fetch hari libur nasional dari balasai.id API
async function fetchNasional(year: number): Promise<LiburInfo[]> {
  try {
    const res = await fetch(`https://app.balasai.id/api/v1/holidays?year=${year}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []).map((d: { tanggal: string; keterangan: string }) => ({
      tanggal: d.tanggal,
      keterangan: d.keterangan,
      sumber: "nasional" as const,
    }));
  } catch {
    return [];
  }
}

// Fetch custom holidays dari app_setting (JSON array of {tanggal, keterangan})
async function fetchCustom(): Promise<LiburInfo[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: "hari_libur_custom" } });
  if (!row?.value) return [];
  try {
    const arr = JSON.parse(row.value) as { tanggal: string; keterangan: string }[];
    return arr.map((d) => ({ ...d, sumber: "custom" as const }));
  } catch {
    return [];
  }
}

// Generate semua tanggal Minggu dalam setahun
function sundays(year: number): LiburInfo[] {
  const out: LiburInfo[] = [];
  const d = new Date(year, 0, 1);
  while (d.getFullYear() === year) {
    if (d.getDay() === 0) {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      out.push({ tanggal: `${year}-${mm}-${dd}`, keterangan: "Minggu", sumber: "minggu" });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

// Cek apakah tanggal adalah hari libur (Minggu / nasional / custom)
export function isLibur(date: Date, liburSet: Set<string>): boolean {
  const y = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return liburSet.has(`${y}-${mm}-${dd}`);
}

// Ambil semua hari libur untuk tahun tertentu (nasional + custom + Minggu)
export async function getLibur(year: number): Promise<LiburInfo[]> {
  if (cache && cache.year === year && Date.now() - cache.ts < CACHE_MS) {
    return cache.data;
  }
  const [nasional, custom, minggu] = await Promise.all([fetchNasional(year), fetchCustom(), sundays(year)]);
  // Dedup by tanggal, prioritas: nasional > custom > minggu
  const map = new Map<string, LiburInfo>();
  for (const m of minggu) map.set(m.tanggal, m);
  for (const c of custom) map.set(c.tanggal, c);
  for (const n of nasional) map.set(n.tanggal, n);
  const data = Array.from(map.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  cache = { year, data, ts: Date.now() };
  return data;
}

// Set custom holidays (replace all)
export async function setCustomLibur(items: { tanggal: string; keterangan: string }[]) {
  await prisma.appSetting.upsert({
    where: { key: "hari_libur_custom" },
    create: { key: "hari_libur_custom", value: JSON.stringify(items) },
    update: { value: JSON.stringify(items) },
  });
  cache = null; // invalidate
}
