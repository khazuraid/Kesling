import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

const BULAN_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// GET rencana bulanan — list all sasaran with their rencana status for given bulan/tahun
// OR auto-generate if not exists yet
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user || !user.puskesmasId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const bulan = Number(sp.get("bulan")) || new Date().getMonth() + 1;
  const tahun = Number(sp.get("tahun")) || new Date().getFullYear();

  try {
    // Get all sasaran for this puskesmas, grouped by subCategory (kategori)
    const sasarans = await prisma.sasaran.findMany({
      where: { puskesmasId: user.puskesmasId },
      include: {
        subCategory: { select: { id: true, nama: true, category: { select: { id: true, nama: true, icon: true } } } },
        rencanaBulanan: {
          where: { bulan, tahun },
          select: { id: true, tanggalRencana: true, status: true, prioritas: true, catatan: true },
        },
        results: {
          where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
          select: { id: true, tanggal: true, status: true },
          take: 1,
        },
      },
      orderBy: { nama: "asc" },
    });

    // Group by kategori (subCategory.category)
    const byKategori: Record<
      string,
      {
        kategoriId: number;
        kategoriNama: string;
        kategoriIcon: string;
        subKategori: {
          id: number;
          nama: string;
          sasaran: Array<{
            id: number;
            nama: string;
            alamat: string | null;
            rencanaId: number | null;
            tanggalRencana: string | null;
            status: string;
            prioritas: number;
            sudahDiperiksa: boolean;
            tanggalPeriksa: string | null;
          }>;
        };
      }
    > = {};

    for (const s of sasarans) {
      const cat = s.subCategory.category;
      const sub = s.subCategory;
      if (!byKategori[cat.id]) {
        byKategori[cat.id] = {
          kategoriId: cat.id,
          kategoriNama: cat.nama,
          kategoriIcon: cat.icon || "",
          subKategori: { id: sub.id, nama: sub.nama, sasaran: [] },
        };
      }
      // Ensure subKategori matches — if different sub within same category, still list under one
      if (byKategori[cat.id].subKategori.id !== sub.id) {
        // Multiple sub-categories: flatten, just group under category
      }
      const rencana = s.rencanaBulanan[0];
      const result = s.results[0];
      byKategori[cat.id].subKategori.sasaran.push({
        id: s.id,
        nama: s.nama,
        alamat: s.alamat,
        rencanaId: rencana?.id ?? null,
        tanggalRencana: rencana?.tanggalRencana?.toISOString() ?? null,
        status: rencana?.status ?? "BELUM",
        prioritas: rencana?.prioritas ?? 0,
        sudahDiperiksa: !!result,
        tanggalPeriksa: result?.tanggal?.toISOString() ?? null,
      });
    }

    const totalSasaran = sasarans.length;
    const totalSelesai = sasarans.filter((s) => s.results.length > 0).length;
    const totalTerjadwal = sasarans.filter((s) => s.rencanaBulanan.length > 0).length;

    return NextResponse.json({
      bulan,
      tahun,
      bulanNama: BULAN_NAMES[bulan - 1],
      totalSasaran,
      totalSelesai,
      totalTerjadwal,
      progress: totalSasaran > 0 ? Math.round((totalSelesai / totalSasaran) * 100) : 0,
      kategori: Object.values(byKategori),
    });
  } catch (err) {
    console.error("[mobile/v1/rencana-bulanan] error:", err);
    return NextResponse.json({ error: "Gagal memuat rencana bulanan", detail: String(err) }, { status: 500 });
  }
}
