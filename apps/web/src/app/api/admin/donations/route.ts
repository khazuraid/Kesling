import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";
import { ensureDonationTable } from "@/lib/sumopod";

export const GET = withAdmin(async (req: NextRequest) => {
  try {
    await ensureDonationTable();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(10, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    let donations: any[] = [];
    let total = 0;
    let stats = { _sum: { amount: 0 }, _count: { id: 0 } };

    try {
      const [d, t, s] = await Promise.all([
        prisma.donation.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          skip,
          include: {
            user: { select: { id: true, nama: true, email: true, role: true } },
          },
        }),
        prisma.donation.count(),
        prisma.donation.aggregate({
          where: { status: "PAID" },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);
      donations = d;
      total = t;
      stats = s as any;
    } catch (dbErr) {
      console.warn("[Admin Donations DB Query Fallback]:", dbErr);
    }

    let apiKeySetting = null;
    let webhookSecretSetting = null;
    let webhookTokenSetting = null;
    let popupEnabledSetting = null;
    let modeSetting = null;

    try {
      [apiKeySetting, webhookSecretSetting, webhookTokenSetting, popupEnabledSetting, modeSetting] = await Promise.all([
        prisma.appSetting.findUnique({ where: { key: "SUMOPOD_API_KEY" } }),
        prisma.appSetting.findUnique({ where: { key: "WEBHOOK_SECRET" } }),
        prisma.appSetting.findUnique({ where: { key: "WEBHOOK_TOKEN" } }),
        prisma.appSetting.findUnique({ where: { key: "DONATION_POPUP_ENABLED" } }),
        prisma.appSetting.findUnique({ where: { key: "SUMOPOD_MODE" } }),
      ]);
    } catch (cfgErr) {
      console.warn("[Admin Donations Config Query Fallback]:", cfgErr);
    }

    return NextResponse.json({
      donations,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        totalPaidAmount: stats._sum?.amount || 0,
        totalPaidCount: stats._count?.id || 0,
      },
      config: {
        hasApiKey: Boolean(apiKeySetting?.value || process.env.SUMOPOD_API_KEY),
        hasWebhookSecret: Boolean(webhookSecretSetting?.value || process.env.WEBHOOK_SECRET),
        hasWebhookToken: Boolean(webhookTokenSetting?.value || process.env.WEBHOOK_TOKEN),
        popupEnabled: popupEnabledSetting?.value !== "false", // default true
        mode: modeSetting?.value || (process.env.SUMOPOD_BASE_URL?.includes("sandbox") ? "sandbox" : "sandbox"), // default sandbox as per Managed Payment guide
      },
    });
  } catch (error: any) {
    console.error("[Admin Donations GET Error]:", error);
    return NextResponse.json({
      donations: [],
      total: 0,
      page: 1,
      totalPages: 1,
      summary: { totalPaidAmount: 0, totalPaidCount: 0 },
      config: {
        hasApiKey: Boolean(process.env.SUMOPOD_API_KEY),
        hasWebhookSecret: Boolean(process.env.WEBHOOK_SECRET),
        hasWebhookToken: Boolean(process.env.WEBHOOK_TOKEN),
        popupEnabled: true,
        mode: "sandbox",
      },
    });
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    await ensureDonationTable();

    const body = await req.json();
    const { apiKey, webhookSecret, webhookToken, popupEnabled, mode } = body;

    const updates: Promise<any>[] = [];

    if (mode !== undefined) {
      const validMode = mode === "live" ? "live" : "sandbox";
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "SUMOPOD_MODE" },
          update: { value: validMode },
          create: { key: "SUMOPOD_MODE", value: validMode },
        }),
      );
    }

    if (apiKey !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "SUMOPOD_API_KEY" },
          update: { value: String(apiKey).trim() },
          create: { key: "SUMOPOD_API_KEY", value: String(apiKey).trim() },
        }),
      );
    }

    if (webhookSecret !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "WEBHOOK_SECRET" },
          update: { value: String(webhookSecret).trim() },
          create: { key: "WEBHOOK_SECRET", value: String(webhookSecret).trim() },
        }),
      );
    }

    if (webhookToken !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "WEBHOOK_TOKEN" },
          update: { value: String(webhookToken).trim() },
          create: { key: "WEBHOOK_TOKEN", value: String(webhookToken).trim() },
        }),
      );
    }

    if (popupEnabled !== undefined) {
      updates.push(
        prisma.appSetting.upsert({
          where: { key: "DONATION_POPUP_ENABLED" },
          update: { value: String(popupEnabled) },
          create: { key: "DONATION_POPUP_ENABLED", value: String(popupEnabled) },
        }),
      );
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: "Pengaturan donasi berhasil disimpan" });
  } catch (error: any) {
    console.error("[Admin Donations POST Error]:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan donasi" }, { status: 500 });
  }
});
