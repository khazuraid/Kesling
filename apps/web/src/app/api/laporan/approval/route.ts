import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { cacheInvalidate } from "@/lib/redis";

// GET -- list laporan untuk approval (semua status, filter client-side)
export const GET = withAdmin(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl;
  const bulan = searchParams.get("bulan") ? Number(searchParams.get("bulan")) : undefined;
  const tahun = Number(searchParams.get("tahun")) || new Date().getFullYear();
  const categoryId = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : undefined;
  const status = searchParams.get("status");

  const where: any = { tahun };
  if (bulan) where.bulan = bulan;
  if (categoryId) where.categoryId = categoryId;
  if (status) where.status = status;

  const laporan = await prisma.dynamicLaporan.findMany({
    where,
    include: {
      puskesmas: { select: { id: true, nama: true } },
      category: {
        select: {
          id: true,
          nama: true,
          code: true,
          icon: true,
          isRowBased: true,
          parameters: { select: { id: true, nama: true, type: true } },
          subCategories: { select: { id: true, nama: true } },
        },
      },
      values: true,
    },
    orderBy: [{ bulan: "desc" }, { puskesmas: { urutan: "asc" } }],
  });

  return NextResponse.json(laporan);
});

// PATCH -- approve atau reject satu laporan
export const PATCH = withAdmin(async (req: NextRequest) => {
  const user = (req as any).user;
  const { laporanId, action, catatan } = await req.json();

  if (!laporanId || !action) {
    return NextResponse.json({ error: "laporanId dan action wajib diisi" }, { status: 400 });
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "action harus APPROVE atau REJECT" }, { status: 400 });
  }

  const laporan = await prisma.dynamicLaporan.findUnique({
    where: { id: Number(laporanId) },
    include: {
      puskesmas: true,
      category: true,
    },
  });

  if (!laporan) {
    return NextResponse.json({ error: "Laporan tidak ditemukan" }, { status: 404 });
  }

  if (laporan.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: `Laporan tidak bisa di-${action.toLowerCase()} karena status saat ini: ${laporan.status}` },
      { status: 400 },
    );
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";

  const updated = await prisma.dynamicLaporan.update({
    where: { id: Number(laporanId) },
    data: {
      status: newStatus,
      catatan: catatan || laporan.catatan,
      updatedBy: user.id,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      tableName: "dynamic_laporan",
      recordId: laporan.id,
      oldData: { status: laporan.status },
      newData: { status: newStatus, catatan },
    },
  });

  // Notifikasi ke operator puskesmas
  try {
    const operators = await prisma.user.findMany({
      where: { puskesmasId: laporan.puskesmasId, role: "OPERATOR" },
    });

    const isApproved = action === "APPROVE";
    const bulanNama = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][
      laporan.bulan
    ];

    await Promise.all(
      operators.map((op) =>
        prisma.notification.create({
          data: {
            userId: op.id,
            title: isApproved ? "Laporan Disetujui" : "Laporan Dikembalikan",
            message: isApproved
              ? `Laporan ${laporan.category.nama} ${bulanNama} ${laporan.tahun} telah disetujui oleh Admin.`
              : `Laporan ${laporan.category.nama} ${bulanNama} ${laporan.tahun} dikembalikan untuk diperbaiki.${catatan ? ` Catatan: ${catatan}` : ""}`,
          },
        }),
      ),
    );
  } catch (err) {
    console.error("Gagal mengirim notifikasi approval:", err);
  }

  // Invalidate cache
  await cacheInvalidate(`laporan:${laporan.category.code}:*`);
  await cacheInvalidate("dashboard:*");
  await cacheInvalidate("ranking:*");
  await cacheInvalidate("trend:*");

  return NextResponse.json(updated);
});

// POST -- bulk approve/reject
export const POST = withAdmin(async (req: NextRequest) => {
  const user = (req as any).user;
  const { laporanIds, action } = await req.json();

  if (!Array.isArray(laporanIds) || laporanIds.length === 0 || !action) {
    return NextResponse.json({ error: "laporanIds (array) dan action wajib diisi" }, { status: 400 });
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "action harus APPROVE atau REJECT" }, { status: 400 });
  }

  const newStatus = action === "APPROVE" ? "APPROVED" : "DRAFT";

  const result = await prisma.dynamicLaporan.updateMany({
    where: {
      id: { in: laporanIds.map(Number) },
      status: "SUBMITTED", // hanya update yang SUBMITTED
    },
    data: { status: newStatus, updatedBy: user.id },
  });

  await cacheInvalidate("dashboard:*");
  await cacheInvalidate("ranking:*");
  await cacheInvalidate("trend:*");

  return NextResponse.json({ updated: result.count });
});
