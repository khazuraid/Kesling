type V = {
  valueString: string | null;
  valueNumber: number | null;
  field: { tipe: string; grup: string | null; config: any } | null;
};

/** Skor 0-100 satu hasil inspeksi (rumus sama dengan aggregate-inspection.ts). */
export function computeResultSkor(values: V[], templateConfig: any = {}): number | null {
  const penilaian = values.filter((v) => v.field && v.field.grup !== "__META__");
  if (!penilaian.length) return null;

  const rumus = templateConfig.rumus || "sum";
  let gained = 0;
  let max = 0;
  for (const v of penilaian) {
    const f = v.field!;
    const fConfig = f.config || {};
    const skorBenar = fConfig.skorBenar ?? fConfig.skor ?? 1;
    const skorSalah = fConfig.skorSalah ?? 0;
    max += Math.max(skorBenar, skorSalah);
    if (f.tipe === "BOOLEAN") {
      if (v.valueString === "TRUE") gained += skorBenar;
      else if (v.valueString === "FALSE") gained += skorSalah;
    } else if (f.tipe === "NUMBER") {
      gained += (v.valueNumber || 0) * (fConfig.skor ?? 0);
    } else if (v.valueString || v.valueNumber) {
      gained += fConfig.skor ?? 0;
    }
  }
  if (rumus === "percentage" || rumus === "weighted") {
    return max > 0 ? Math.round((gained / max) * 100) : 0;
  }
  return Math.round(gained);
}
