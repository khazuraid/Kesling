import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";

const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// GET rencana bulanan — list all sasaran + rencana status per kategori
export const GET = withAuth(async (req: NextRequest) => {
  try {
    const user = (req as unknown as { user: { id: number; role: string; puskesmasId: number | null } }).user;
    const sp = req.nextUrl.searchParams;
    const bulan = Number(sp.get("bulan")) || new Date().getMonth() + 1;
    const tahun = Number(sp.get("tahun")) || new Date().getFullYear();
    // Admin/Dinkes can view any puskesmas via ?puskesmasId; operator forced to own
    const puskesmasId =
      user.role === "OPERATOR"
        ? user.puskesmasId
        : sp.get("puskesmasId")
          ? Number(sp.get("puskesmasId"))
          : user.puskesmasId;
    if (!puskesmasId) return NextResponse.json({ error: "Tidak ada puskesmas" }, { status: 400 });

    const sasarans = await prisma.sasaran.findMany({
      where: { puskesmasId },
      include: {
        subCategory: { select: { id: true, nama: true, category: { select: { id: true, nama: true, icon: true } } } },
        rencanaBulanan: {
          where: { bulan, tahun },
          select: { id: true, tanggalRencana: true, status: true, prioritas: true, catatan: true },
        },
        results: {
          where: { bulan, tahun, status: { in: ["SUBMITTED", "APPROVED"] } },
          select: { id: true, tanggal: true },
          take: 1,
        },
      },
      orderBy: { nama: "asc" },
    });

    const byKategori: Record<
      string,
      {
        kategoriNama: string;
        kategoriIcon: string;
        list: Array<{
          sasaranId: number;
          nama: string;
          alamat: string | null;
          rencanaId: number | null;
          tanggalRencana: string | null;
          status: string;
          prioritas: number;
          sudahDiperiksa: boolean;
          tanggalPeriksa: string | null;
        }>;
      }
    > = {};

    for (const s of sasarans) {
      const cat = s.subCategory.category;
      const key = cat.id;
      if (!byKategori[key]) byKategori[key] = { kategoriNama: cat.nama, kategoriIcon: cat.icon || "", list: [] };
      const rencana = s.rencanaBulanan[0];
      const result = s.results[0];
      byKategori[key].list.push({
        sasaranId: s.id,
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
      kategori: Object.values(byKategori).map((k) => ({
        kategoriNama: k.kategoriNama,
        kategoriIcon: k.kategoriIcon,
        list: k.list,
      })),
    });
  } catch (err) {
    console.error("[api/rencana-bulanan] error:", err);
    return NextResponse.json({ error: "Gagal memuat rencana bulanan", detail: String(err) }, { status: 500 });
  }
});
