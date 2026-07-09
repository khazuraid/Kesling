import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== "seedkesling123") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Seed Templates idempotently by name.
    // Do not rely on total count because production may already contain old/inactive templates.
    const createdTemplates: string[] = [];
    const existingDepotTemplate = await prisma.inspectionTemplate.findFirst({
      where: { nama: "Pemeriksaan Depot Air Minum" },
      select: { id: true },
    });
    if (!existingDepotTemplate) {
      await prisma.inspectionTemplate.create({
        data: {
          nama: "Pemeriksaan Depot Air Minum",
          deskripsi: "Formulir inspeksi kesehatan lingkungan depot air minum isi ulang.",
          isActive: true,
          puskesmasId: null,
          subCategoryId: 5, // Depot Air Minum
          config: {},
          fields: {
            create: [
              {
                pertanyaan: "Apakah air baku memenuhi standar fisik (tidak keruh/berbau)?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 1,
                grup: "Bahan Baku",
              },
              {
                pertanyaan: "Apakah peralatan filter & ultraviolet berfungsi dengan baik?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 2,
                grup: "Peralatan",
              },
              {
                pertanyaan: "Apakah operator menjaga kebersihan tangan & pakaian?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 3,
                grup: "Penjamah",
              },
              { pertanyaan: "Catatan temuan khusus", tipe: "TEXT", isRequired: false, urutan: 4, grup: "Lain-lain" },
            ],
          },
        },
      });
      createdTemplates.push("Pemeriksaan Depot Air Minum");
    }

    const existingRestoranTemplate = await prisma.inspectionTemplate.findFirst({
      where: { nama: "Pemeriksaan Restoran / Rumah Makan" },
      select: { id: true },
    });
    if (!existingRestoranTemplate) {
      await prisma.inspectionTemplate.create({
        data: {
          nama: "Pemeriksaan Restoran / Rumah Makan",
          deskripsi: "Formulir inspeksi sanitasi dan higiene restoran/rumah makan.",
          isActive: true,
          puskesmasId: null,
          subCategoryId: 2, // Restoran
          config: {},
          fields: {
            create: [
              {
                pertanyaan: "Apakah area pengolahan makanan bebas dari vektor penular penyakit (lalat/tikus/kecoa)?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 1,
                grup: "Sanitasi Area",
              },
              {
                pertanyaan: "Apakah bahan makanan disimpan pada suhu yang tepat?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 2,
                grup: "Penyimpanan",
              },
              {
                pertanyaan: "Apakah peralatan masak dicuci dengan air bersih & sabun?",
                tipe: "BOOLEAN",
                isRequired: true,
                urutan: 3,
                grup: "Peralatan",
              },
              { pertanyaan: "Catatan temuan khusus", tipe: "TEXT", isRequired: false, urutan: 4, grup: "Lain-lain" },
            ],
          },
        },
      });
      createdTemplates.push("Pemeriksaan Restoran / Rumah Makan");
    }

    // 2. Seed Sasarans idempotently by name.
    const createdSasarans: string[] = [];
    const existingDepotSasaran = await prisma.sasaran.findFirst({
      where: { nama: "Depot Air Minum Biru Kesambi" },
      select: { id: true },
    });
    if (!existingDepotSasaran) {
      await prisma.sasaran.create({
        data: {
          nama: "Depot Air Minum Biru Kesambi",
          alamat: "Jl. Kesambi No. 123, Cirebon",
          pemilik: "Bpk. Joko",
          kontak: "08123456789",
          lat: -6.723,
          lng: 108.556,
          puskesmasId: 6, // Kesambi
          subCategoryId: 5,
          dataDinamis: {},
        },
      });
      createdSasarans.push("Depot Air Minum Biru Kesambi");
    }

    const existingRestoranSasaran = await prisma.sasaran.findFirst({
      where: { nama: "Restoran KFC Kesambi" },
      select: { id: true },
    });
    if (!existingRestoranSasaran) {
      await prisma.sasaran.create({
        data: {
          nama: "Restoran KFC Kesambi",
          alamat: "Jl. Kesambi Raya No. 45, Cirebon",
          pemilik: "PT. Fast Food Indonesia",
          kontak: "0231-987654",
          lat: -6.724,
          lng: 108.557,
          puskesmasId: 6, // Kesambi
          subCategoryId: 2,
          dataDinamis: {},
        },
      });
      createdSasarans.push("Restoran KFC Kesambi");
    }

    return NextResponse.json({
      success: true,
      message: "Production database successfully seeded with templates and sasarans!",
      createdTemplates,
      createdSasarans,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to seed" }, { status: 500 });
  }
}
