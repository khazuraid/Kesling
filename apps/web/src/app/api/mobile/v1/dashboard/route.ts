import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser, resolvePuskesmasId } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  try {
    const puskesmasId = resolvePuskesmasId(req, user);
    const userId = user.id;

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // count active templates
    const templateCount = await prisma.inspectionTemplate.count({
      where: {
        isActive: true,
        OR: [{ puskesmasId }, { puskesmasId: null }],
      },
    });

    // count sasaran
    const sasaranCount = await prisma.sasaran.count({
      where: puskesmasId ? { puskesmasId } : {},
    });

    // count total inspection results by this user this month
    const userInspectionsCount = await prisma.inspectionResult.count({
      where: {
        userId,
        bulan: currentMonth,
        tahun: currentYear,
      },
    });

    // recent 5 inspections
    const recentInspections = await prisma.inspectionResult.findMany({
      where: { userId },
      select: {
        id: true,
        namaSasaran: true,
        alamatSasaran: true,
        status: true,
        tanggal: true,
        createdAt: true,
        template: { select: { nama: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      templateCount,
      sasaranCount,
      userInspectionsCount,
      recentInspections: recentInspections.map((item) => ({
        id: item.id,
        namaSasaran: item.namaSasaran || "Tanpa Nama",
        alamatSasaran: item.alamatSasaran || "-",
        status: item.status,
        tanggal: item.tanggal || item.createdAt,
        templateName: item.template?.nama ?? "Template Dihapus",
      })),
    });
  } catch (err) {
    console.error("[mobile/v1/dashboard] error:", err);
    return NextResponse.json({ error: "Gagal memuat dashboard", detail: String(err) }, { status: 500 });
  }
}
