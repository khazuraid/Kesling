import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { recalculateLaporanBulanan } from "@/lib/aggregate-inspection";
import { cacheInvalidate } from "@/lib/redis";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const subCategoryId = searchParams.get("subCategoryId");
    const categoryId = searchParams.get("categoryId");
    const requestedPkmId = searchParams.get("puskesmasId");
    const search = searchParams.get("search")?.trim() || "";
    const paginated = searchParams.get("paginated") === "1";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "50", 10)));

    const where: any = {};

    // Puskesmas scope: Operator locked to their own puskesmas
    if (user.role === "OPERATOR") {
      where.puskesmasId = user.puskesmasId;
    } else if (requestedPkmId && requestedPkmId !== "all") {
      where.puskesmasId = Number(requestedPkmId);
    }

    // SubCategory filter
    if (subCategoryId) {
      where.subCategoryId = Number(subCategoryId);
    } else if (categoryId) {
      where.subCategory = { categoryId: Number(categoryId) };
    }

    // Search filter
    if (search) {
      where.OR = [
        { nama: { contains: search, mode: "insensitive" } },
        { alamat: { contains: search, mode: "insensitive" } },
        { pemilik: { contains: search, mode: "insensitive" } },
        { kontak: { contains: search, mode: "insensitive" } },
      ];
    }

    if (!paginated) {
      const data = await prisma.sasaran.findMany({
        where,
        include: {
          subCategory: {
            include: {
              category: { select: { id: true, nama: true, code: true } },
            },
          },
          puskesmas: { select: { id: true, nama: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return NextResponse.json(data);
    }

    const [total, data] = await Promise.all([
      prisma.sasaran.count({ where }),
      prisma.sasaran.findMany({
        where,
        include: {
          subCategory: {
            include: {
              category: { select: { id: true, nama: true, code: true } },
            },
          },
          puskesmas: { select: { id: true, nama: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal memuat data sasaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { nama, subCategoryId, puskesmasId, alamat, pemilik, kontak, lat, lng, dataDinamis } = body;

    if (!nama || !subCategoryId) {
      return NextResponse.json({ error: "Nama dan Sub-Kategori wajib diisi" }, { status: 400 });
    }

    const finalPkmId = user.role === "OPERATOR" ? user.puskesmasId : Number(puskesmasId) || user.puskesmasId;

    if (!finalPkmId) {
      return NextResponse.json({ error: "Puskesmas wajib ditentukan" }, { status: 400 });
    }

    const newSasaran = await prisma.sasaran.create({
      data: {
        nama: String(nama).trim(),
        subCategoryId: Number(subCategoryId),
        puskesmasId: Number(finalPkmId),
        alamat: alamat ? String(alamat).trim() : null,
        pemilik: pemilik ? String(pemilik).trim() : null,
        kontak: kontak ? String(kontak).trim() : null,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        dataDinamis: dataDinamis || {},
      },
      include: {
        subCategory: { select: { id: true, nama: true } },
        puskesmas: { select: { id: true, nama: true } },
      },
    });

    // Invalidate laporan cache and auto-recalculate current month's report
    await cacheInvalidate("laporan:*");
    try {
      const now = new Date();
      await recalculateLaporanBulanan({
        puskesmasId: Number(finalPkmId),
        subCategoryId: Number(subCategoryId),
        bulan: now.getMonth() + 1,
        tahun: now.getFullYear(),
      });
    } catch {}

    return NextResponse.json(newSasaran, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Gagal menyimpan sasaran" }, { status: 500 });
  }
}
