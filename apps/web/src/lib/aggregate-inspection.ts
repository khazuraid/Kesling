import { prisma } from "@apps-kes/database";

function isGolonganMatch(targetGolongan?: string | null, selectedGolongan?: string | null): boolean {
  if (!targetGolongan || targetGolongan === "ALL" || targetGolongan === "SEMUA" || targetGolongan === "KEDUANYA") {
    return true;
  }
  if (!selectedGolongan) {
    return true;
  }
  const cleanSelected = selectedGolongan.toLowerCase().replace(/[^a-z0-9]/g, "");
  const targets = targetGolongan
    .split(",")
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
  return targets.some(
    (cleanTarget) =>
      cleanTarget === cleanSelected || cleanSelected.includes(cleanTarget) || cleanTarget.includes(cleanSelected),
  );
}

export async function recalculateLaporanBulanan({
  puskesmasId,
  categoryId,
  subCategoryId,
  bulan,
  tahun,
}: {
  puskesmasId: number;
  categoryId?: number | null;
  subCategoryId: number;
  bulan: number;
  tahun: number;
}) {
  const catId =
    categoryId || (await prisma.dynamicSubCategory.findUnique({ where: { id: subCategoryId } }))?.categoryId;

  if (!catId) return;

  let laporan = await prisma.dynamicLaporan.findFirst({
    where: { puskesmasId, categoryId: catId, bulan, tahun },
  });

  if (!laporan) {
    laporan = await prisma.dynamicLaporan.create({
      data: { categoryId: catId, puskesmasId, bulan, tahun, status: "DRAFT" },
    });
  }

  // 1. Ambil SEMUA Inspection Result yang APPROVED, pada bulan & tahun & puskesmas & subKategori ini
  const allResults: any[] = await prisma.inspectionResult.findMany({
    where: {
      puskesmasId,
      bulan,
      tahun,
      status: "APPROVED",
      template: { subCategoryId },
    },
    include: {
      template: { include: { fields: true } },
      sasaran: true,
      values: { include: { field: true } },
    },
  });

  // Kami akan menjumlahkan secara keseluruhan
  let sumDiperiksa = 0;
  let sumMs = 0;
  let sumTms = 0;

  for (const r of allResults) {
    const template = r.template as any;
    const config = template.config || {};
    const rumus = config.rumus || "sum";
    const op = config.thresholdOperator || ">=";
    const thresh = config.thresholdValue ?? 80;

    let gained = 0;
    let max = 0;
    let countBenar = 0;
    let countSalah = 0;

    // Deteksi golongan sasaran dari field __META__ hasil inspeksi atau data dasar sasaran
    const metaValues = r.values.filter((v: any) => v.field.grup === "__META__");
    let selectedGolongan = "";
    for (const mv of metaValues) {
      const val = String(mv.valueString || "").trim();
      if (!val) continue;
      const q = (mv.field.pertanyaan || "").toLowerCase();
      if (q.includes("golongan") || q.includes("tipe") || val.toLowerCase().includes("golongan")) {
        selectedGolongan = val;
        break;
      }
    }
    if (!selectedGolongan && r.sasaran?.dataDinamis) {
      const dyn = r.sasaran.dataDinamis as Record<string, unknown>;
      for (const [k, v] of Object.entries(dyn)) {
        if (k.toLowerCase().includes("golongan") && typeof v === "string" && v) {
          selectedGolongan = v;
          break;
        }
      }
    }

    const valueMap = new Map<number, string>();
    for (const v of r.values) {
      valueMap.set(v.fieldId, String(v.valueString || "").toUpperCase());
    }
    const allFields = r.template?.fields || r.values.map((v: any) => v.field);

    const penilaian = r.values.filter((v: any) => v.field.grup !== "__META__");
    const countTotal = penilaian.length;

    for (const v of penilaian) {
      const fConfig = (v.field.config as any) || {};
      const targetGol = fConfig.targetGolongan || v.field.targetGolongan || "ALL";
      const isTargetSpecific = targetGol && targetGol !== "ALL" && targetGol !== "SEMUA";
      const isGolonganMismatch =
        isTargetSpecific && Boolean(selectedGolongan) && !isGolonganMatch(targetGol, selectedGolongan);

      // Abaikan butir nonaktif atau tidak cocok golongan sasaran
      if (v.field.isDisabled || fConfig.isDisabled || isGolonganMismatch) continue;

      // Cek butir bersyarat (dependsOn)
      const dep = fConfig.dependsOn || v.field.dependsOn;
      if (dep) {
        const parent = allFields.find(
          (p: any, idx: number) => p.id === dep.parentId || p.urutan === dep.parentIndex || idx === dep.parentIndex,
        );
        const parentVal = parent ? (valueMap.get(parent.id) ?? "") : "";
        const reqVal = String(dep.requiredValue ?? "TRUE").toUpperCase();
        if (parentVal !== reqVal) {
          // Parent tidak memenuhi syarat, butir ini tidak aktif / tidak dinilai
          continue;
        }
      }

      // Abaikan opsi T/A (Tidak Ada / NA) dari gained dan max
      const upperVal = String(v.valueString || "").toUpperCase();
      if (upperVal === "NA") continue;

      const skorBenar = fConfig.skorBenar ?? fConfig.skor ?? 1;
      const skorSalah = fConfig.skorSalah ?? 0;
      max += Math.max(skorBenar, skorSalah);

      if (v.field.tipe === "BOOLEAN") {
        if (upperVal === "TRUE") {
          gained += skorBenar;
          countBenar++;
        } else if (upperVal === "FALSE") {
          gained += skorSalah;
          countSalah++;
        }
      } else if (v.field.tipe === "NUMBER") {
        gained += (v.valueNumber || 0) * (fConfig.skor ?? 0);
      } else if (v.valueString || v.valueNumber) {
        gained += fConfig.skor ?? 0;
      }
    }

    let finalValue = gained;
    if (rumus === "percentage" || rumus === "weighted") {
      finalValue = max > 0 ? (gained / max) * 100 : 0;
    } else if (rumus === "custom" && config.customFormula) {
      try {
        const evalStr = config.customFormula
          .replace(/SUM\(\)/g, String(gained))
          .replace(/AVG\(\)/g, String(countTotal > 0 ? gained / countTotal : 0))
          .replace(/COUNT\(\)/g, String(countTotal))
          .replace(/✓/g, String(countBenar))
          .replace(/✗/g, String(countSalah));
        const res = new Function(`return ${evalStr}`)();
        if (!Number.isNaN(res)) finalValue = res;
      } catch {}
    }

    let isMemenuhiSyarat = false;
    if (op === ">=") isMemenuhiSyarat = finalValue >= thresh;
    else if (op === ">") isMemenuhiSyarat = finalValue > thresh;
    else if (op === "<=") isMemenuhiSyarat = finalValue <= thresh;
    else if (op === "<") isMemenuhiSyarat = finalValue < thresh;

    // Tambahkan 1 pemeriksaan ke total agregat
    sumDiperiksa += 1;
    if (isMemenuhiSyarat) sumMs += 1;
    else sumTms += 1;
  }

  // 2. Sekarang kita update nilainya ke database Laporan Bulanan
  // Pertama, temukan ID Parameter untuk Diperiksa, MS, dan TMS
  const parameters = await prisma.dynamicParameter.findMany({
    where: { categoryId: catId },
  });

  let configBuilder: any = {};
  if (allResults.length > 0) {
    configBuilder = (allResults[0].template as any)?.config?.agregasi || {};
  } else {
    const tmpl = await prisma.inspectionTemplate.findFirst({
      where: { subCategoryId },
      select: { config: true },
    });
    configBuilder = (tmpl?.config as any)?.agregasi || {};
  }

  // Resolve ID Parameter (Pakai mapping builder jika ada, jika tidak fallback ke NAMA/CODE)
  const paramDiperiksaId =
    configBuilder.paramDiperiksaId ||
    parameters.find((p) => p.code === "diperiksa" || p.code === "diperiksaJumlah")?.id ||
    parameters.find((p) => p.nama.toLowerCase().includes("diperiksa") && !p.nama.toLowerCase().includes("kk"))?.id;

  const paramMsId =
    configBuilder.paramMsId ||
    parameters.find((p) => p.code === "laikJumlah" || p.code === "diperiksaMs")?.id ||
    parameters.find(
      (p) =>
        p.nama.toLowerCase().includes("ms") ||
        p.nama.toLowerCase().includes("laik") ||
        p.nama.toLowerCase() === "memenuhi syarat",
    )?.id;

  const paramTmsId =
    configBuilder.paramTmsId ||
    parameters.find((p) => p.code === "diperiksaTms")?.id ||
    parameters.find((p) => p.nama.toLowerCase().includes("tms") || p.nama.toLowerCase() === "tidak memenuhi syarat")
      ?.id;

  // 3. Update database nilai dengan sum total (override total, jangan nambah-nambah buta)
  const updates = [];
  if (paramDiperiksaId) updates.push({ id: paramDiperiksaId, val: sumDiperiksa });
  if (paramMsId) updates.push({ id: paramMsId, val: sumMs });
  if (paramTmsId) updates.push({ id: paramTmsId, val: sumTms });

  console.log("AGREGASI RUNNING:", {
    subCategoryId,
    catId,
    allResultsCount: allResults.length,
    sumDiperiksa,
    sumMs,
    sumTms,
    paramDiperiksaId,
    paramMsId,
    paramTmsId,
  });

  for (const up of updates) {
    const existingVal = await prisma.dynamicLaporanValue.findFirst({
      where: { laporanId: laporan.id, parameterId: up.id, subCategoryId },
    });

    if (existingVal) {
      await prisma.dynamicLaporanValue.update({
        where: { id: existingVal.id },
        data: { value: String(up.val) },
      });
    } else {
      await prisma.dynamicLaporanValue.create({
        data: {
          laporanId: laporan.id,
          parameterId: up.id,
          subCategoryId,
          value: String(up.val),
        },
      });
    }
  }
}

export async function aggregateInspectionToLaporan(resultId: number) {
  const result: any = await prisma.inspectionResult.findUnique({
    where: { id: resultId },
    include: { template: true },
  });

  if (result?.status !== "APPROVED" || !result.template?.subCategoryId) return;

  const bulan = result.bulan;
  const tahun = result.tahun;
  const puskesmasId = result.puskesmasId;
  const subCategoryId = result.template.subCategoryId;
  const categoryId = (await prisma.dynamicSubCategory.findUnique({ where: { id: subCategoryId } }))?.categoryId;

  if (!categoryId) return;

  await recalculateLaporanBulanan({
    puskesmasId,
    categoryId,
    subCategoryId,
    bulan,
    tahun,
  });
}
