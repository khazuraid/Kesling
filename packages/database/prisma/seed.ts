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

  console.log("✅ Seed completed successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
