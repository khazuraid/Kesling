import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { ensureDonationTable } from "@/lib/sumopod";

export const GET = withAuth(async (_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) => {
  try {
    await ensureDonationTable();

    const { orderId } = await params;
    const donation = await prisma.donation.findUnique({
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        amount: true,
        status: true,
        paymentUrl: true,
        qrCodeUrl: true,
        paidAt: true,
        createdAt: true,
      },
    });

    if (!donation) {
      return NextResponse.json({ error: "Donasi tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ donation });
  } catch (error: any) {
    console.error("[Donation Status Error]:", error);
    return NextResponse.json({ error: "Gagal mengambil status donasi" }, { status: 500 });
  }
});
