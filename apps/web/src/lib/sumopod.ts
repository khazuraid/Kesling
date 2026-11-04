import crypto from "node:crypto";
import { prisma } from "@apps-kes/database";

/**
 * Lazy auto-create tabel donation & enum DonationStatus bila belum ada di DB produksi.
 */
let donationTableEnsured = false;
export async function ensureDonationTable() {
  if (donationTableEnsured) return;
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "donation" (
        "id" SERIAL PRIMARY KEY,
        "orderId" TEXT NOT NULL UNIQUE,
        "paymentId" TEXT,
        "userId" INTEGER,
        "donorName" TEXT,
        "donorEmail" TEXT,
        "amount" INTEGER NOT NULL,
        "paymentUrl" TEXT,
        "qrCodeUrl" TEXT,
        "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
        "paymentMethod" TEXT NOT NULL DEFAULT 'QRIS',
        "rawWebhookData" JSONB,
        "paidAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "donation_status_idx" ON "donation"("status");
      CREATE INDEX IF NOT EXISTS "donation_userId_idx" ON "donation"("userId");
    `);
    donationTableEnsured = true;
  } catch (err) {
    console.warn("[ensureDonationTable warning]:", err);
  }
}

/**
 * Verifikasi signature webhook Svix (HMAC-SHA256).
 * Mendukung multiple signatures yang dipisahkan spasi ("v1,<sig>").
 */
export function verifyWebhookSignature(
  secret: string,
  svixId?: string | null,
  svixTimestamp?: string | null,
  svixSignature?: string | null,
  rawBody?: string | null,
): boolean {
  if (!secret || !svixId || !svixTimestamp || !svixSignature || rawBody == null) {
    return false;
  }

  try {
    const cleanSecret = secret.startsWith("whsec_") ? secret.replace("whsec_", "") : secret;
    const secretBytes = Buffer.from(cleanSecret, "base64");
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;

    const expectedSignature = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

    const signatures = svixSignature.split(" ").map((s) => {
      const parts = s.split(",");
      return parts.length > 1 ? parts[1] : parts[0];
    });

    return signatures.includes(expectedSignature);
  } catch (err) {
    console.error("[SumoPod Webhook Verify] Signature Error:", err);
    return false;
  }
}

/**
 * Verifikasi token webhook sederhana via header x-webhook-token.
 */
export function verifyWebhookToken(expectedToken?: string | null, receivedToken?: string | null): boolean {
  if (!expectedToken || !receivedToken) return false;
  return expectedToken === receivedToken;
}

export interface CreateSumoPodPaymentParams {
  orderId: string;
  amount: number;
  currency?: string;
  expiresInHours?: number;
  paymentMethodTypeCode?: string;
  successReturnUrl?: string;
  cancelReturnUrl?: string;
}

export interface SumoPodPaymentResponse {
  success: boolean;
  data?: {
    id?: string;
    order_id?: string;
    payment_link_url?: string;
    payment_url?: string;
    payment_code?: string;
    qr_code_url?: string;
    qr_string?: string;
    amount?: number;
    status?: string;
    [key: string]: any;
  };
  error?: string;
}

/**
 * Call API SumoPod Create Payment
 * POST https://api-pay.sumopod.com/api/v1/payments (Live)
 * POST https://api-pay-sandbox.sumopod.com/api/v1/payments (Sandbox)
 */
export async function createSumoPodPayment(
  params: CreateSumoPodPaymentParams,
  apiKeyOverride?: string,
  baseUrlOverride?: string,
): Promise<SumoPodPaymentResponse> {
  const apiKey = apiKeyOverride || process.env.SUMOPOD_API_KEY;
  const baseUrl = baseUrlOverride || process.env.SUMOPOD_BASE_URL || "https://api-pay.sumopod.com";

  if (!apiKey) {
    throw new Error("SUMOPOD_API_KEY belum dikonfigurasi di environment atau pengaturan sistem.");
  }

  const payload: Record<string, any> = {
    order_id: params.orderId,
    amount: params.amount,
    currency: params.currency || "IDR",
    expires_in_hours: params.expiresInHours || 24,
    payment_method_type_code: params.paymentMethodTypeCode || "QRIS",
  };

  if (params.successReturnUrl) {
    payload.success_return_url = params.successReturnUrl;
  }
  if (params.cancelReturnUrl) {
    payload.cancel_return_url = params.cancelReturnUrl;
  }

  const res = await fetch(`${baseUrl}/api/v1/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(responseText);
  } catch {
    json = { raw: responseText };
  }

  if (!res.ok) {
    const errorMsg = json.message || json.error || `SumoPod API returned HTTP ${res.status}`;
    return {
      success: false,
      error: errorMsg,
    };
  }

  return {
    success: true,
    data: json.data || json,
  };
}
