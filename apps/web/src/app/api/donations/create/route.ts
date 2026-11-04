import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { createSumoPodPayment } from "@/lib/sumopod";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const user = (req as any).user;
    const body = await req.json();
    const amount = Number(body.amount);

    if (!amount || amount < 1000) {
      return NextResponse.json({ error: "Nominal donasi minimal Rp 1.000" }, { status: 400 });
    }

    // Ambil API Key dari AppSetting jika ada override, fallback ke process.env
    const settingKey = await prisma.appSetting.findUnique({
      where: { key: "SUMOPOD_API_KEY" },
    });
    const apiKey = settingKey?.value || process.env.SUMOPOD_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gateway pembayaran SumoPod belum dikonfigurasi (SUMOPOD_API_KEY belum disetel). Silakan hubungi Administrator.",
        },
        { status: 503 },
      );
    }

    const orderId = `DONASI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const host = req.headers.get("host") || "kesling.biz.id";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Request ke SumoPod
    const sumoRes = await createSumoPodPayment(
      {
        orderId,
        amount,
        currency: "IDR",
        expiresInHours: 24,
        paymentMethodTypeCode: "QRIS",
        successReturnUrl: `${baseUrl}/dashboard?donation=success`,
        cancelReturnUrl: `${baseUrl}/dashboard?donation=cancel`,
      },
      apiKey,
    );

    if (!sumoRes.success || !sumoRes.data) {
      return NextResponse.json({ error: sumoRes.error || "Gagal membuat tagihan QRIS ke SumoPod" }, { status: 502 });
    }

    const data = sumoRes.data;
    const paymentId = data.id || data.payment_id || null;
    const paymentUrl = data.payment_url || data.checkout_url || data.url || null;
    const qrCodeUrl = data.qr_code_url || data.qr_image_url || data.qr_string || null;

    // Simpan ke database
    const donation = await prisma.donation.create({
      data: {
        orderId,
        paymentId: paymentId ? String(paymentId) : null,
        userId: user?.id || null,
        donorName: body.donorName || user?.name || user?.nama || "Hamba Allah",
        donorEmail: user?.email || null,
        amount,
        paymentUrl,
        qrCodeUrl,
        status: "PENDING",
        paymentMethod: "QRIS",
      },
    });

    return NextResponse.json({
      success: true,
      donation: {
        id: donation.id,
        orderId: donation.orderId,
        amount: donation.amount,
        paymentUrl: donation.paymentUrl,
        qrCodeUrl: donation.qrCodeUrl,
        status: donation.status,
      },
    });
  } catch (error: any) {
    console.error("[Create Donation Error]:", error);
    return NextResponse.json({ error: error?.message || "Terjadi kesalahan internal server" }, { status: 500 });
  }
});
