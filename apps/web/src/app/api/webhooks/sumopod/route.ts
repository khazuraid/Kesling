import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { ensureDonationTable, verifyWebhookSignature, verifyWebhookToken } from "@/lib/sumopod";

export async function POST(req: NextRequest) {
  try {
    await ensureDonationTable();
    // 1. Ambil raw body string untuk verifikasi HMAC
    const rawBody = await req.text();

    // 2. Ambil header-header autentikasi webhook
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");
    const receivedToken = req.headers.get("x-webhook-token");

    // Ambil secret dari database/env
    const settingSecret = await prisma.appSetting.findUnique({
      where: { key: "WEBHOOK_SECRET" },
    });
    const webhookSecret = settingSecret?.value || process.env.WEBHOOK_SECRET;

    const settingToken = await prisma.appSetting.findUnique({
      where: { key: "WEBHOOK_TOKEN" },
    });
    const webhookToken = settingToken?.value || process.env.WEBHOOK_TOKEN;

    let isAuthorized = false;

    // Cara 1: Svix HMAC verification
    if (svixSignature && webhookSecret) {
      isAuthorized = verifyWebhookSignature(webhookSecret, svixId, svixTimestamp, svixSignature, rawBody);
    }

    // Cara 2: Token match verification (fallback atau jika token disertakan)
    if (!isAuthorized && receivedToken && webhookToken) {
      isAuthorized = verifyWebhookToken(webhookToken, receivedToken);
    }

    // Tolak jika tidak lolos kedua validasi keamanan
    if (!isAuthorized) {
      console.warn("[SumoPod Webhook] Verifikasi gagal: Signature atau Token tidak valid.");
      return new NextResponse("Invalid signature or webhook token", { status: 401 });
    }

    // 3. Parse JSON event
    let event: any = {};
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new NextResponse("Invalid JSON body", { status: 400 });
    }

    console.log("[SumoPod Webhook] Verified webhook received:", event.event_type || event.type || "unknown");

    const eventType = String(event.event_type || event.type || "").toLowerCase();
    const data = event.data || event;
    const orderId = data.order_id || event.order_id;
    const paymentId = data.id || data.payment_id || event.payment_id;

    if (!orderId && !paymentId) {
      return new NextResponse("order_id or payment_id not found in payload", { status: 400 });
    }

    // Cek status pembayaran dari payload (mendukung event payment.completed, payment.failed, payment.expired)
    const isSuccess =
      eventType.includes("completed") ||
      eventType.includes("success") ||
      eventType.includes("paid") ||
      eventType.includes("settlement") ||
      String(data.status || "").toLowerCase() === "completed" ||
      String(data.status || "").toLowerCase() === "paid" ||
      String(data.status || "").toLowerCase() === "success";

    const isExpiredOrFailed =
      eventType.includes("expired") ||
      eventType.includes("failed") ||
      eventType.includes("cancel") ||
      String(data.status || "").toLowerCase() === "expired" ||
      String(data.status || "").toLowerCase() === "failed";

    // Cari transaksi donasi
    const donation = await prisma.donation.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ orderId: String(orderId) }] : []),
          ...(paymentId ? [{ paymentId: String(paymentId) }] : []),
        ],
      },
    });

    if (donation) {
      let newStatus = donation.status;
      let paidAt = donation.paidAt;

      if (isSuccess) {
        newStatus = "PAID";
        paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
      } else if (isExpiredOrFailed && donation.status !== "PAID") {
        newStatus = "EXPIRED";
      }

      await prisma.donation.update({
        where: { id: donation.id },
        data: {
          status: newStatus,
          paymentId: paymentId ? String(paymentId) : donation.paymentId,
          paidAt,
          rawWebhookData: event,
        },
      });

      console.log(`[SumoPod Webhook] Donasi ${donation.orderId} diperbarui menjadi status: ${newStatus}`);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error: any) {
    console.error("[SumoPod Webhook Handler Error]:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
