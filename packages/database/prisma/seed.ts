import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed Puskesmas
  const puskesmasList = [
    "Kejaksan",
    "Nelayan",
    "Pamitran",
    "Jalan Kembang",
    "Gunung Sari",
    "Kesambi",
    "Majasem",
    "Sunyaragi",
    "Drajat",
    "Jagasatru",
    "Pulasaren",
    "Astanagarib",
    "Pekalangan",
    "Pesisir",
    "Cangkol",
    "Kesunean",
    "Pegambiran",
    "Perumnas Utara",
    "Larangan",
    "Kalijaga",
    "Kalitanjung",
  ];
  for (let i = 0; i < puskesmasList.length; i++) {
    await prisma.puskesmas.upsert({
      where: { nama: puskesmasList[i] },
      update: {},
      create: { nama: puskesmasList[i], urutan: i + 1 },
    });
  }

  // Seed Jenis TPP
  const jenisTppList = [
    "Jasaboga",
    "Restoran",
    "Rumah Makan",
    "TPP Tertentu",
    "Depot Air Minum",
    "Dapur Gerai Pangan Jajanan",
    "Gerai Pangan Jajanan",
    "Gerai Pangan Jajanan Keliling",
    "Pangan Jajanan Keliling Gerobak",
    "Sentra Pangan Jajanan/Kantin",
  ];
  for (let i = 0; i < jenisTppList.length; i++) {
    await prisma.jenisTpp.upsert({
      where: { nama: jenisTppList[i] },
      update: {},
      create: { nama: jenisTppList[i], urutan: i + 1 },
    });
  }

  // Seed Jenis Sarana SPAL
  const saranaSpal = [
    "Riool",
    "Septick Tank",
    "Sumur Resapan",
    "Saluran Tertutup",
    "Saluran Terbuka",
    "Sungai",
    "Sarana Umum",
    "Tidak Ada Sarana",
  ];
  for (let i = 0; i < saranaSpal.length; i++) {
    await prisma.jenisSarana.upsert({
      where: { nama_kategori: { nama: saranaSpal[i], kategori: "SPAL" } },
      update: {},
      create: { nama: saranaSpal[i], kategori: "SPAL", urutan: i + 1 },
    });
  }

  // Seed Jenis Sarana SAB
  const saranaSab = [
    "SGL Terlindung",
    "SGL dengan Pompa",
    "Sumur Bor dengan Pompa",
    "SPT",
    "PP/PDAM/SR",
    "Sarana Umum",
  ];
  for (let i = 0; i < saranaSab.length; i++) {
    await prisma.jenisSarana.upsert({
      where: { nama_kategori: { nama: saranaSab[i], kategori: "SAB" } },
      update: {},
      create: { nama: saranaSab[i], kategori: "SAB", urutan: i + 1 },
    });
  }

  // Seed Jenis Sarana Jamban
  const saranaJamban = [
    "Leher Angsa + Septick Tank",
    "LA + Riool",
    "LA + Sungai",
    "LA + Cubluk",
    "Pelengsengan",
    "Cemplung",
    "Sarana Umum",
    "Tidak Ada Sarana",
  ];
  for (let i = 0; i < saranaJamban.length; i++) {
    await prisma.jenisSarana.upsert({
      where: { nama_kategori: { nama: saranaJamban[i], kategori: "JAMBAN" } },
      update: {},
      create: { nama: saranaJamban[i], kategori: "JAMBAN", urutan: i + 1 },
    });
  }

  // Seed Jenis TTU Prioritas
  const ttuPrioritas = [
    "SD/MI",
    "SMP/MTS",
    "SMA/MA",
    "Pasar",
    "Terminal",
    "Pelabuhan",
    "Bandara",
    "Akomodasi/Hotel",
    "Stasiun",
    "Tempat Rekreasi",
    "Tempat Olah Raga",
    "Mesjid/Gereja/Vihara",
  ];
  for (let i = 0; i < ttuPrioritas.length; i++) {
    await prisma.jenisTtu.upsert({
      where: { nama_kategori: { nama: ttuPrioritas[i], kategori: "PRIORITAS" } },
      update: {},
      create: { nama: ttuPrioritas[i], kategori: "PRIORITAS", urutan: i + 1 },
    });
  }

  // Seed Jenis TTU Non-Prioritas
  const ttuNonPrioritas = [
    "Puskesmas",
    "Praktik Mandiri",
    "Pustu",
    "Apotik",
    "Perkantoran",
    "Musholla",
    "TK/KB",
    "TFU Lainnya",
  ];
  for (let i = 0; i < ttuNonPrioritas.length; i++) {
    await prisma.jenisTtu.upsert({
      where: { nama_kategori: { nama: ttuNonPrioritas[i], kategori: "NON_PRIORITAS" } },
      update: {},
      create: { nama: ttuNonPrioritas[i], kategori: "NON_PRIORITAS", urutan: i + 1 },
    });
  }

  // Seed Admin User
  const hashedPassword = await hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@dinkes.go.id" },
    update: {},
    create: {
      nama: "Administrator",
      email: "admin@dinkes.go.id",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  // --- SEED PLATFORM DINAMIS ---
  console.log("🌱 Seeding dynamic platform metadata...");

  // 1. TPP (Tempat Pengolahan Pangan)
  const catTpp = await prisma.dynamicCategory.upsert({
    where: { code: "tpp" },
    update: {},
    create: {
      nama: "Tempat Pengolahan Pangan (TPP)",
      code: "tpp",
      deskripsi: "Pengawasan dan pembinaan tempat pengolahan makanan/minuman agar memenuhi syarat higienitas.",
      icon: "🍳",
      urutan: 1,
      isRowBased: true,
    },
  });

  const paramsTpp = [
    { nama: "Terdaftar", code: "terdaftar", type: "NUMBER", urutan: 1 },
    { nama: "Diperiksa", code: "diperiksa", type: "NUMBER", urutan: 2 },
    { nama: "Laik Jumlah", code: "laikJumlah", type: "NUMBER", urutan: 3 },
  ];
  for (const p of paramsTpp) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catTpp.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catTpp.id },
    });
  }

  for (let i = 0; i < jenisTppList.length; i++) {
    await prisma.dynamicSubCategory.upsert({
      where: { categoryId_nama: { categoryId: catTpp.id, nama: jenisTppList[i] } },
      update: {},
      create: { categoryId: catTpp.id, nama: jenisTppList[i], urutan: i + 1 },
    });
  }

  await prisma.dynamicComplianceFormula.upsert({
    where: { categoryId: catTpp.id },
    update: {},
    create: {
      categoryId: catTpp.id,
      numeratorCode: "laikJumlah",
      denominatorCode: "diperiksa",
      description: "Persentase TPP Laik = (Laik Jumlah / Diperiksa) * 100",
    },
  });

  // 2. SPAL (Saluran Pembuangan Air Limbah)
  const catSpal = await prisma.dynamicCategory.upsert({
    where: { code: "spal" },
    update: {},
    create: {
      nama: "Saluran Pembuangan Air Limbah (SPAL)",
      code: "spal",
      deskripsi: "Pengawasan kualitas sarana pembuangan air limbah rumah tangga.",
      icon: "🚰",
      urutan: 2,
      isRowBased: true,
    },
  });

  const paramsSpal = [
    { nama: "Jumlah Sarana", code: "jumlah", type: "NUMBER", urutan: 1 },
    { nama: "Jumlah KK", code: "kk", type: "NUMBER", urutan: 2 },
    { nama: "Jumlah Penduduk", code: "pddk", type: "NUMBER", urutan: 3 },
    { nama: "Jumlah Diperiksa", code: "diperiksaJumlah", type: "NUMBER", urutan: 4 },
    { nama: "Memenuhi Syarat (MS)", code: "diperiksaMs", type: "NUMBER", urutan: 5 },
    { nama: "KK Diperiksa", code: "diperiksaKk", type: "NUMBER", urutan: 6 },
    { nama: "Penduduk Diperiksa", code: "diperiksaPddk", type: "NUMBER", urutan: 7 },
  ];
  for (const p of paramsSpal) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catSpal.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catSpal.id },
    });
  }

  for (let i = 0; i < saranaSpal.length; i++) {
    await prisma.dynamicSubCategory.upsert({
      where: { categoryId_nama: { categoryId: catSpal.id, nama: saranaSpal[i] } },
      update: {},
      create: { categoryId: catSpal.id, nama: saranaSpal[i], urutan: i + 1 },
    });
  }

  await prisma.dynamicComplianceFormula.upsert({
    where: { categoryId: catSpal.id },
    update: {},
    create: {
      categoryId: catSpal.id,
      numeratorCode: "diperiksaMs",
      denominatorCode: "diperiksaJumlah",
      description: "Persentase SPAL Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100",
    },
  });

  // 3. SAB (Sarana Air Bersih)
  const catSab = await prisma.dynamicCategory.upsert({
    where: { code: "sab" },
    update: {},
    create: {
      nama: "Sarana Air Bersih (SAB)",
      code: "sab",
      deskripsi: "Pengawasan kualitas dan higienitas sarana air bersih / air minum.",
      icon: "💧",
      urutan: 3,
      isRowBased: true,
    },
  });

  const paramsSab = [
    ...paramsSpal,
    { nama: "Risiko Rendah (R)", code: "inspeksiR", type: "NUMBER", urutan: 8 },
    { nama: "Risiko Sedang (S)", code: "inspeksiS", type: "NUMBER", urutan: 9 },
    { nama: "Risiko Tinggi (T)", code: "inspeksiT", type: "NUMBER", urutan: 10 },
    { nama: "Risiko Amat Tinggi (AT)", code: "inspeksiAt", type: "NUMBER", urutan: 11 },
  ];
  for (const p of paramsSab) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catSab.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catSab.id },
    });
  }

  for (let i = 0; i < saranaSab.length; i++) {
    await prisma.dynamicSubCategory.upsert({
      where: { categoryId_nama: { categoryId: catSab.id, nama: saranaSab[i] } },
      update: {},
      create: { categoryId: catSab.id, nama: saranaSab[i], urutan: i + 1 },
    });
  }

  await prisma.dynamicComplianceFormula.upsert({
    where: { categoryId: catSab.id },
    update: {},
    create: {
      categoryId: catSab.id,
      numeratorCode: "diperiksaMs",
      denominatorCode: "diperiksaJumlah",
      description: "Persentase SAB Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100",
    },
  });

  // 4. JAMBAN
  const catJamban = await prisma.dynamicCategory.upsert({
    where: { code: "jamban" },
    update: {},
    create: {
      nama: "Jamban Keluarga (Sanitasi Aman)",
      code: "jamban",
      deskripsi: "Pengawasan terhadap kualitas fasilitas pembuangan tinja keluarga.",
      icon: "🚽",
      urutan: 4,
      isRowBased: true,
    },
  });

  for (const p of paramsSpal) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catJamban.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catJamban.id },
    });
  }

  for (let i = 0; i < saranaJamban.length; i++) {
    await prisma.dynamicSubCategory.upsert({
      where: { categoryId_nama: { categoryId: catJamban.id, nama: saranaJamban[i] } },
      update: {},
      create: { categoryId: catJamban.id, nama: saranaJamban[i], urutan: i + 1 },
    });
  }

  await prisma.dynamicComplianceFormula.upsert({
    where: { categoryId: catJamban.id },
    update: {},
    create: {
      categoryId: catJamban.id,
      numeratorCode: "diperiksaMs",
      denominatorCode: "diperiksaJumlah",
      description: "Persentase Jamban Memenuhi Syarat = (Memenuhi Syarat / Jumlah Diperiksa) * 100",
    },
  });

  // 5. RUMAH (Rumah Sehat)
  const catRumah = await prisma.dynamicCategory.upsert({
    where: { code: "rumah" },
    update: {},
    create: {
      nama: "Rumah Sehat",
      code: "rumah",
      deskripsi: "Evaluasi kelayakan sanitasi rumah tinggal berdasarkan berbagai aspek kenyamanan dan kebersihan.",
      icon: "🏠",
      urutan: 5,
      isRowBased: false, // Form Tunggal (Card-Based)
    },
  });

  const paramsRumah = [
    { nama: "Jumlah Rumah Ada", code: "jumlahRumahAda", type: "NUMBER", urutan: 1 },
    { nama: "Jumlah Diperiksa", code: "jumlahDiperiksa", type: "NUMBER", urutan: 2 },
    { nama: "Ventilasi MS", code: "ventilasiMs", type: "NUMBER", urutan: 3 },
    { nama: "Ventilasi TMS", code: "ventilasiTms", type: "NUMBER", urutan: 4 },
    { nama: "Penerangan MS", code: "peneranganMs", type: "NUMBER", urutan: 5 },
    { nama: "Penerangan TMS", code: "peneranganTms", type: "NUMBER", urutan: 6 },
    { nama: "Lantai MS", code: "lantaiMs", type: "NUMBER", urutan: 7 },
    { nama: "Lantai TMS", code: "lantaiTms", type: "NUMBER", urutan: 8 },
    { nama: "Kepadatan Huni MS", code: "kepadatanHuniMs", type: "NUMBER", urutan: 9 },
    { nama: "Kepadatan Huni TMS", code: "kepadatanHuniTms", type: "NUMBER", urutan: 10 },
    { nama: "Lubang Asap MS", code: "lubangAsapMs", type: "NUMBER", urutan: 11 },
    { nama: "Lubang Asap TMS", code: "lubangAsapTms", type: "NUMBER", urutan: 12 },
    { nama: "Jamban MS", code: "jambanMs", type: "NUMBER", urutan: 13 },
    { nama: "Jamban TMS", code: "jambanTms", type: "NUMBER", urutan: 14 },
    { nama: "Air Bersih MS", code: "airBersihMs", type: "NUMBER", urutan: 15 },
    { nama: "Air Bersih TMS", code: "airBersihTms", type: "NUMBER", urutan: 16 },
    { nama: "Air Limbah MS", code: "airLimbahMs", type: "NUMBER", urutan: 17 },
    { nama: "Air Limbah TMS", code: "airLimbahTms", type: "NUMBER", urutan: 18 },
    { nama: "Sampah MS", code: "sampahMs", type: "NUMBER", urutan: 19 },
    { nama: "Sampah TMS", code: "sampahTms", type: "NUMBER", urutan: 20 },
    { nama: "Kandang MS", code: "kandangMs", type: "NUMBER", urutan: 21 },
    { nama: "Kandang TMS", code: "kandangTms", type: "NUMBER", urutan: 22 },
    { nama: "Kandang Tidak Ada", code: "kandangTidakAda", type: "NUMBER", urutan: 23 },
    { nama: "Hasil MS", code: "hasilMs", type: "NUMBER", urutan: 24 },
    { nama: "Hasil TMS", code: "hasilTms", type: "NUMBER", urutan: 25 },
  ];
  for (const p of paramsRumah) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catRumah.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catRumah.id },
    });
  }

  await prisma.dynamicComplianceFormula.upsert({
    where: { categoryId: catRumah.id },
    update: {},
    create: {
      categoryId: catRumah.id,
      numeratorCode: "hasilMs",
      denominatorCode: "jumlahDiperiksa",
      description: "Persentase Rumah Sehat = (Hasil MS / Jumlah Diperiksa) * 100",
    },
  });

  // 6. TTU (Tempat-Tempat Umum)
  const catTtu = await prisma.dynamicCategory.upsert({
    where: { code: "ttu" },
    update: {},
    create: {
      nama: "Tempat-Tempat Umum (TTU)",
      code: "ttu",
      deskripsi: "Pengawasan sanitasi fasilitas publik (Sekolah, Pasar, Ibadah, dll).",
      icon: "🏢",
      urutan: 6,
      isRowBased: true,
    },
  });

  const paramsTtu = [
    { nama: "Jumlah Total", code: "jumlahTotal", type: "NUMBER", urutan: 1 },
    { nama: "Memenuhi Syarat (MS)", code: "ms", type: "NUMBER", urutan: 2 },
    { nama: "Tidak Memenuhi Syarat (TMS)", code: "tms", type: "NUMBER", urutan: 3 },
  ];
  for (const p of paramsTtu) {
    await prisma.dynamicParameter.upsert({
      where: { categoryId_code: { categoryId: catTtu.id, code: p.code } },
      update: {},
      create: { ...p, categoryId: catTtu.id },
    });
  }

  const allTtuSubCategories = [...ttuPrioritas, ...ttuNonPrioritas];
  for (let i = 0; i < allTtuSubCategories.length; i++) {
    await prisma.dynamicSubCategory.upsert({
      where: { categoryId_nama: { categoryId: catTtu.id, nama: allTtuSubCategories[i] } },
      update: {},
      create: { categoryId: catTtu.id, nama: allTtuSubCategories[i], urutan: i + 1 },
    });
  }

  // --- MIGRATION OF HISTORICAL STATIC DATA ---
  console.log("🚚 Migrating historical static data to dynamic tables...");

  async function upsertLaporanValue(
    laporanId: number,
    parameterId: number,
    subCategoryId: number | null,
    value: string,
  ) {
    const existing = await prisma.dynamicLaporanValue.findFirst({
      where: { laporanId, parameterId, subCategoryId },
    });
    if (existing) {
      await prisma.dynamicLaporanValue.update({
        where: { id: existing.id },
        data: { value },
      });
    } else {
      await prisma.dynamicLaporanValue.create({
        data: { laporanId, parameterId, subCategoryId, value },
      });
    }
  }

  // A. Migrate Targets
  const staticTargets = await prisma.target.findMany();
  for (const t of staticTargets) {
    const category = await prisma.dynamicCategory.findUnique({ where: { code: t.jenis } });
    if (!category) continue;

    await prisma.dynamicTarget.upsert({
      where: {
        tahun_categoryId_puskesmasId: {
          tahun: t.tahun,
          categoryId: category.id,
          puskesmasId: t.puskesmasId!,
        },
      },
      update: { targetPersen: t.targetPersen },
      create: {
        tahun: t.tahun,
        categoryId: category.id,
        puskesmasId: t.puskesmasId,
        targetPersen: t.targetPersen,
      },
    });
  }

  // B. Migrate TPP Laporan
  const staticTpp = await prisma.laporanTpp.findMany({
    include: { jenisTpp: true },
  });
  for (const item of staticTpp) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catTpp.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catTpp.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const subCat = await prisma.dynamicSubCategory.findFirst({
      where: { categoryId: catTpp.id, nama: item.jenisTpp.nama },
    });
    if (!subCat) continue;

    const paramCodes = ["terdaftar", "diperiksa", "laikJumlah"];
    const valuesMap: Record<string, number> = {
      terdaftar: item.terdaftar,
      diperiksa: item.diperiksa,
      laikJumlah: item.laikJumlah,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catTpp.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, subCat.id, String(valuesMap[code]));
    }
  }

  // C. Migrate SPAL Laporan
  const staticSpal = await prisma.laporanSpal.findMany({
    include: { jenisSarana: true },
  });
  for (const item of staticSpal) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catSpal.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catSpal.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const subCat = await prisma.dynamicSubCategory.findFirst({
      where: { categoryId: catSpal.id, nama: item.jenisSarana.nama },
    });
    if (!subCat) continue;

    const paramCodes = ["jumlah", "kk", "pddk", "diperiksaJumlah", "diperiksaMs", "diperiksaKk", "diperiksaPddk"];
    const valuesMap: Record<string, number> = {
      jumlah: item.jumlah,
      kk: item.kk,
      pddk: item.pddk,
      diperiksaJumlah: item.diperiksaJumlah,
      diperiksaMs: item.diperiksaMs,
      diperiksaKk: item.diperiksaKk,
      diperiksaPddk: item.diperiksaPddk,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catSpal.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, subCat.id, String(valuesMap[code]));
    }
  }

  // D. Migrate SAB Laporan
  const staticSab = await prisma.laporanSab.findMany({
    include: { jenisSarana: true },
  });
  for (const item of staticSab) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catSab.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catSab.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const subCat = await prisma.dynamicSubCategory.findFirst({
      where: { categoryId: catSab.id, nama: item.jenisSarana.nama },
    });
    if (!subCat) continue;

    const paramCodes = [
      "jumlah",
      "kk",
      "pddk",
      "diperiksaJumlah",
      "diperiksaMs",
      "diperiksaKk",
      "diperiksaPddk",
      "inspeksiR",
      "inspeksiS",
      "inspeksiT",
      "inspeksiAt",
    ];
    const valuesMap: Record<string, number> = {
      jumlah: item.jumlah,
      kk: item.kk,
      pddk: item.pddk,
      diperiksaJumlah: item.diperiksaJumlah,
      diperiksaMs: item.diperiksaMs,
      diperiksaKk: item.diperiksaKk,
      diperiksaPddk: item.diperiksaPddk,
      inspeksiR: item.inspeksiR,
      inspeksiS: item.inspeksiS,
      inspeksiT: item.inspeksiT,
      inspeksiAt: item.inspeksiAt,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catSab.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, subCat.id, String(valuesMap[code]));
    }
  }

  // E. Migrate Jamban Laporan
  const staticJamban = await prisma.laporanJamban.findMany({
    include: { jenisSarana: true },
  });
  for (const item of staticJamban) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catJamban.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catJamban.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const subCat = await prisma.dynamicSubCategory.findFirst({
      where: { categoryId: catJamban.id, nama: item.jenisSarana.nama },
    });
    if (!subCat) continue;

    const paramCodes = ["jumlah", "kk", "pddk", "diperiksaJumlah", "diperiksaMs", "diperiksaKk", "diperiksaPddk"];
    const valuesMap: Record<string, number> = {
      jumlah: item.jumlah,
      kk: item.kk,
      pddk: item.pddk,
      diperiksaJumlah: item.diperiksaJumlah,
      diperiksaMs: item.diperiksaMs,
      diperiksaKk: item.diperiksaKk,
      diperiksaPddk: item.diperiksaPddk,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catJamban.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, subCat.id, String(valuesMap[code]));
    }
  }

  // F. Migrate Rumah Laporan
  const staticRumah = await prisma.laporanRumah.findMany();
  for (const item of staticRumah) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catRumah.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catRumah.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const paramCodes = [
      "jumlahRumahAda",
      "jumlahDiperiksa",
      "ventilasiMs",
      "ventilasiTms",
      "peneranganMs",
      "peneranganTms",
      "lantaiMs",
      "lantaiTms",
      "kepadatanHuniMs",
      "kepadatanHuniTms",
      "lubangAsapMs",
      "lubangAsapTms",
      "jambanMs",
      "jambanTms",
      "airBersihMs",
      "airBersihTms",
      "airLimbahMs",
      "airLimbahTms",
      "sampahMs",
      "sampahTms",
      "kandangMs",
      "kandangTms",
      "kandangTidakAda",
      "hasilMs",
      "hasilTms",
    ];
    const valuesMap: Record<string, number> = {
      jumlahRumahAda: item.jumlahRumahAda,
      jumlahDiperiksa: item.jumlahDiperiksa,
      ventilasiMs: item.ventilasiMs,
      ventilasiTms: item.ventilasiTms,
      peneranganMs: item.peneranganMs,
      peneranganTms: item.peneranganTms,
      lantaiMs: item.lantaiMs,
      lantaiTms: item.lantaiTms,
      kepadatanHuniMs: item.kepadatanHuniMs,
      kepadatanHuniTms: item.kepadatanHuniTms,
      lubangAsapMs: item.lubangAsapMs,
      lubangAsapTms: item.lubangAsapTms,
      jambanMs: item.jambanMs,
      jambanTms: item.jambanTms,
      airBersihMs: item.airBersihMs,
      airBersihTms: item.airBersihTms,
      airLimbahMs: item.airLimbahMs,
      airLimbahTms: item.airLimbahTms,
      sampahMs: item.sampahMs,
      sampahTms: item.sampahTms,
      kandangMs: item.kandangMs,
      kandangTms: item.kandangTms,
      kandangTidakAda: item.kandangTidakAda,
      hasilMs: item.hasilMs,
      hasilTms: item.hasilTms,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catRumah.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, null, String(valuesMap[code]));
    }
  }

  // G. Migrate TTU Laporan
  const staticTtu = await prisma.laporanTtu.findMany({
    include: { jenisTtu: true },
  });
  for (const item of staticTtu) {
    const dynamicLaporan = await prisma.dynamicLaporan.upsert({
      where: {
        puskesmasId_categoryId_bulan_tahun: {
          puskesmasId: item.puskesmasId,
          categoryId: catTtu.id,
          bulan: item.bulan,
          tahun: item.tahun,
        },
      },
      update: {
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
      create: {
        puskesmasId: item.puskesmasId,
        categoryId: catTtu.id,
        bulan: item.bulan,
        tahun: item.tahun,
        status: item.status,
        catatan: item.catatan,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
      },
    });

    const subCat = await prisma.dynamicSubCategory.findFirst({
      where: { categoryId: catTtu.id, nama: item.jenisTtu.nama },
    });
    if (!subCat) continue;

    const paramCodes = ["jumlahTotal", "ms", "tms"];
    const valuesMap: Record<string, number> = {
      jumlahTotal: item.jumlahTotal,
      ms: item.ms,
      tms: item.tms,
    };

    for (const code of paramCodes) {
      const param = await prisma.dynamicParameter.findFirst({
        where: { categoryId: catTtu.id, code },
      });
      if (!param) continue;

      await upsertLaporanValue(dynamicLaporan.id, param.id, subCat.id, String(valuesMap[code]));
    }
  }

  console.log("✅ Seed & migration completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
