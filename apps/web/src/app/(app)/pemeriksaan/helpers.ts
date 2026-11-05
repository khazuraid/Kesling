export function toRoman(num: number): string {
  if (num <= 0) return "";
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let r = "";
  for (let i = 0; i < vals.length; i++) {
    while (num >= vals[i]) {
      r += syms[i];
      num -= vals[i];
    }
  }
  return r;
}

export interface LabComplianceResult {
  status: "MS" | "TMS" | "PENDING" | "NA";
  label: string;
  isMS: boolean;
  keterangan?: string;
}

/**
 * Evaluasi kepatuhan hasil uji lab terhadap standar baku mutu kesehatan lingkungan (Permenkes)
 */
export function evaluateLabCompliance(
  value: any,
  bakuMutuConfig?: {
    kadarMaksimum?: string | number | null;
    operator?: string | null;
    satuan?: string | null;
  },
): LabComplianceResult {
  if (value === null || value === undefined || value === "") {
    return { status: "PENDING", label: "Belum Diuji", isMS: false };
  }

  const strVal = String(value).trim();
  const upperVal = strVal.toUpperCase();

  if (upperVal === "NA" || upperVal === "T/A") {
    return { status: "NA", label: "T/A", isMS: true };
  }

  const rawKadar =
    bakuMutuConfig?.kadarMaksimum !== undefined && bakuMutuConfig?.kadarMaksimum !== null
      ? String(bakuMutuConfig.kadarMaksimum).trim()
      : "";
  const rawOp = (bakuMutuConfig?.operator || "<=").trim().toLowerCase();

  // Jika tidak ada konfigurasi baku mutu spesifik, default anggap MS jika terisi
  if (!rawKadar) {
    return { status: "MS", label: "MS", isMS: true };
  }

  const lowerVal = strVal.toLowerCase();
  const lowerKadar = rawKadar.toLowerCase();

  // 1. Evaluasi Negatif / Organoleptik (Bau, Rasa, Kualitatif)
  if (
    rawOp === "negatif" ||
    lowerKadar.includes("tidak") ||
    lowerKadar.includes("negatif") ||
    lowerKadar.includes("nihil") ||
    lowerKadar.includes("bebas")
  ) {
    const isQualitativeMS =
      lowerVal.includes("tidak") ||
      lowerVal.includes("negatif") ||
      lowerVal.includes("nihil") ||
      lowerVal.includes("normal") ||
      lowerVal.includes("bebas") ||
      strVal === "0" ||
      upperVal === "TRUE";

    return {
      status: isQualitativeMS ? "MS" : "TMS",
      label: isQualitativeMS ? "MS" : "TMS",
      isMS: isQualitativeMS,
      keterangan: isQualitativeMS ? "Sesuai baku mutu" : `Melebihi standar: ${rawKadar}`,
    };
  }

  const numVal = parseFloat(strVal.replace(",", "."));
  if (Number.isNaN(numVal)) {
    // Jika input bukan angka tapi teks kualitatif
    const isMatch = lowerVal === lowerKadar;
    return {
      status: isMatch ? "MS" : "TMS",
      label: isMatch ? "MS" : "TMS",
      isMS: isMatch,
    };
  }

  // 2. Evaluasi Rentang (Range) contoh: "6.5 - 8.5" atau "0.2 - 0.5"
  if (rawOp === "range" || rawKadar.includes("-")) {
    const parts = rawKadar.split(/[-–—]/).map((p) => parseFloat(p.trim().replace(",", ".")));
    if (parts.length >= 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      const min = Math.min(parts[0], parts[1]);
      const max = Math.max(parts[0], parts[1]);
      const inRange = numVal >= min && numVal <= max;
      return {
        status: inRange ? "MS" : "TMS",
        label: inRange ? "MS" : "TMS",
        isMS: inRange,
        keterangan: inRange ? "Dalam rentang baku mutu" : `Di luar rentang ${min} - ${max}`,
      };
    }
  }

  // 3. Evaluasi Numeric Nilai Tunggal
  const targetThreshold = parseFloat(rawKadar.replace(/[^0-9.,]/g, "").replace(",", "."));
  if (Number.isNaN(targetThreshold)) {
    return { status: "MS", label: "MS", isMS: true };
  }

  let pass = false;
  if (rawOp === "<") {
    pass = numVal < targetThreshold;
  } else if (rawOp === "==" || rawOp === "=") {
    pass = numVal === targetThreshold;
  } else if (rawOp === ">=") {
    pass = numVal >= targetThreshold;
  } else if (rawOp === ">") {
    pass = numVal > targetThreshold;
  } else {
    // Default: <= (Kadar Maksimum)
    pass = numVal <= targetThreshold;
  }

  return {
    status: pass ? "MS" : "TMS",
    label: pass ? "MS" : "TMS",
    isMS: pass,
    keterangan: pass ? "Memenuhi batas ambang" : `Melebihi batas ambang maks ${targetThreshold}`,
  };
}
