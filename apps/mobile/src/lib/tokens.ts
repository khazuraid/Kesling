// Design tokens — "Kanso" (mirror KeslingMobile design preview repo)
// Prinsip: whitespace separator, hairline borders, tipografi dominan, warna kategori.

export const C = {
  // canvas: warm paper (Industrial Premium)
  // canvas lebih gelap & hangat — kartu putih kontras
  bg: "#EFE9DD",
  bgScreen: "#F7F5F2",
  bgForm: "#F2EFE9",
  surface: "#FFFFFF",
  offWhite: "#FAF8F4",
  ink: "#1B1917",
  ink2: "#57534E",
  muted: "#A8A29E",
  hairline: "rgba(28,25,23,0.08)",
  // accent utama — teal
  accent: "#00A876",
  accentSoft: "#E0F4EE",
  ok: "#16A34A",
  warn: "#D97706",
  err: "#DC2626",
  dark: "#17140F",
  // warna kategori — palet hangat harmonis
  blue: "#0E94A0", // deep teal-cyan (DAM/air)
  blueL: "#E0F4F4",
  violet: "#C2410C", // terracotta (fasyankes)
  violetL: "#FDEEE5",
  teal: "#00A876", // teal utama (TTU)
  tealL: "#E0F4EE",
  green: "#65A30D", // olive (sanitasi)
  greenL: "#F2F8E3",
  amber: "#D97706", // amber (TPM/makanan)
  amberL: "#FEF3E2",
  red: "#DC2626",
  redL: "#FEF2F2",
  // varian terang chart (referensi pratinjau)
  okL: "#34D399",
  warnL: "#FBBF24",
  errL: "#F87171",
  chartL: "#5EEAD4",
} as const;

export const FONT = {
  reg: "Inter",
  bold: "InterBold",
  mono: "SpaceMono", // fallback: system
} as const;

export const SPACE = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;

// Warna kategori berdasar nama — mirror prototype katColor map
const CAT_MAP: Array<[RegExp, string, string]> = [
  [/tpm|makanan|pasar|warung|restoran|katering|kantin|pkl/i, C.amber, C.amberL],
  [/ttu|tempat umum|sekolah|hotel|terminal|kolam/i, C.blue, C.blueL],
  [/dam|air minum|depot|air/i, C.teal, C.tealL],
  [/fasyankes|klinik|puskesmas|rs|rumah sakit|apotek|lab/i, C.violet, C.violetL],
  [/sanitasi|jamban|spal|tps|sampah|mck/i, C.green, C.greenL],
];

export function katColor(nama?: string | null): { color: string; soft: string } {
  for (const [re, color, soft] of CAT_MAP) if (re.test(nama || "")) return { color, soft };
  return { color: C.blue, soft: C.blueL };
}

// Shared text styles
export const TEXT = {
  display: { fontSize: 34, fontWeight: "800" as const, color: C.ink, letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: "900" as const, color: C.ink, letterSpacing: -0.6 },
  heading: { fontSize: 16, fontWeight: "600" as const, color: C.ink },
  body: { fontSize: 15, fontWeight: "400" as const, color: C.ink },
  sub: { fontSize: 13, fontWeight: "400" as const, color: C.ink2 },
  caption: { fontSize: 11, fontWeight: "500" as const, color: C.muted },
  label: { fontSize: 10, fontWeight: "700" as const, color: C.muted, letterSpacing: 1.4 },
} as const;
