import { prisma } from "@apps-kes/database";

export async function aggregateInspectionToLaporan(resultId: number) {
  const result: any = await prisma.inspectionResult.findUnique({
    where: { id: resultId },
    include: { template: true },
  });

  if (!result || result.status !== "APPROVED" || !result.template.subCategoryId) return;

  const bulan = result.bulan;
  const tahun = result.tahun;
  const pkmId = result.puskesmasId;
  const subCatId = result.template.subCategoryId;
  const catId = result.template.categoryId || (await prisma.dynamicSubCategory.findUnique({ where: { id: subCatId } }))?.categoryId;

  if (!catId) return;

  let laporan = await prisma.dynamicLaporan.findFirst({
    where: { puskesmasId: pkmId, categoryId: catId, bulan, tahun },
  });

  if (!laporan) {
    laporan = await prisma.dynamicLaporan.create({
      data: { categoryId: catId, puskesmasId: pkmId, bulan, tahun, status: "DRAFT" },
    });
  }

  // 1. Ambil SEMUA Inspection Result yang APPROVED, pada bulan & tahun & puskesmas & subKategori ini
  const allResults: any[] = await prisma.inspectionResult.findMany({
    where: { 
      puskesmasId: pkmId, 
      bulan, 
      tahun, 
      status: "APPROVED",
      template: { subCategoryId: subCatId }
    },
    include: { 
      template: true,
      values: { include: { field: true } }
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
    const penilaian = r.values.filter((v: any) => v.field.grup !== "__META__");
    const countTotal = penilaian.length;

    for (const v of penilaian) {
      const fConfig = (v.field.config as any) || {};
      const skorBenar = fConfig.skorBenar ?? fConfig.skor ?? 1;
      const skorSalah = fConfig.skorSalah ?? 0;
      max += Math.max(skorBenar, skorSalah);

      if (v.field.tipe === "BOOLEAN") {
        if (v.valueString === "TRUE") { gained += skorBenar; countBenar++; }
        else if (v.valueString === "FALSE") { gained += skorSalah; countSalah++; }
      } else if (v.field.tipe === "NUMBER") {
        gained += (v.valueNumber || 0) * (fConfig.skor ?? 0);
      } else if (v.valueString || v.valueNumber) {
        gained += (fConfig.skor ?? 0);
      }
    }

    let finalValue = gained;
    if (rumus === "percentage" || rumus === "weighted") {
      finalValue = max > 0 ? (gained / max) * 100 : 0;
    } else if (rumus === "custom" && config.customFormula) {
      try {
        let evalStr = config.customFormula
          .replace(/SUM\(\)/g, String(gained))
          .replace(/AVG\(\)/g, String(countTotal > 0 ? gained / countTotal : 0))
          .replace(/COUNT\(\)/g, String(countTotal))
          .replace(/✓/g, String(countBenar))
          .replace(/✗/g, String(countSalah));
        const res = new Function(`return ${evalStr}`)();
        if (!isNaN(res)) finalValue = res;
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
    where: { categoryId: catId }
  });

  const configBuilder = ((result.template as any)?.config)?.agregasi || {};
  
  // Resolve ID Parameter (Pakai mapping builder jika ada, jika tidak fallback ke NAMA/CODE)
  let paramDiperiksaId = configBuilder.paramDiperiksaId || 
    parameters.find(p => p.code === "diperiksa" || p.code === "diperiksaJumlah")?.id ||
    parameters.find(p => p.nama.toLowerCase().includes("diperiksa") && !p.nama.toLowerCase().includes("kk"))?.id;

  let paramMsId = configBuilder.paramMsId || 
    parameters.find(p => p.code === "laikJumlah" || p.code === "diperiksaMs")?.id ||
    parameters.find(p => p.nama.toLowerCase().includes("ms") || p.nama.toLowerCase().includes("laik") || p.nama.toLowerCase() === "memenuhi syarat")?.id;

  let paramTmsId = configBuilder.paramTmsId || 
    parameters.find(p => p.code === "diperiksaTms")?.id ||
    parameters.find(p => p.nama.toLowerCase().includes("tms") || p.nama.toLowerCase() === "tidak memenuhi syarat")?.id;

  // 3. Update database nilai dengan sum total (override total, jangan nambah-nambah buta)
  const updates = [];
  if (paramDiperiksaId) updates.push({ id: paramDiperiksaId, val: sumDiperiksa });
  if (paramMsId) updates.push({ id: paramMsId, val: sumMs });
  if (paramTmsId) updates.push({ id: paramTmsId, val: sumTms });

  console.log("AGREGASI RUNNING:", {
    resultId,
    allResultsCount: allResults.length,
    sumDiperiksa,
    sumMs,
    sumTms,
    paramDiperiksaId,
    paramMsId,
    paramTmsId,
    subCatId,
    catId
  });

  for (const up of updates) {
    const existingVal = await prisma.dynamicLaporanValue.findFirst({
      where: { laporanId: laporan.id, parameterId: up.id, subCategoryId: subCatId },
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
          subCategoryId: subCatId,
          value: String(up.val),
        },
      });
    }
  }
}
