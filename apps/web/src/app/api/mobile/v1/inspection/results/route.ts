import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Sesi mobile tidak valid atau telah berakhir." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20));

  const where =
    user.role === "OPERATOR" ? { userId: user.id } : user.puskesmasId ? { puskesmasId: user.puskesmasId } : {};

  const [total, results] = await Promise.all([
    prisma.inspectionResult.count({ where }),
    prisma.inspectionResult.findMany({
      where,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    results: results.map((r: any) => ({
      id: r.id,
      namaSasaran: r.namaSasaran || "Tanpa Nama",
      alamatSasaran: r.alamatSasaran || "-",
      status: r.status,
      tanggal: r.tanggal || r.createdAt,
      templateName: r.template?.nama ?? "Template Dihapus",
    })),
  });
}
