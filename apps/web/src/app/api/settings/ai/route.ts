import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

export const GET = withAdmin(async () => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          in: ["ai_provider", "ai_api_key", "ai_model"],
        },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value || "";
    }

    return NextResponse.json({
      provider: map.ai_provider || "openrouter",
      apiKey: map.ai_api_key ? "••••••••••••••••" : "",
      hasKey: Boolean(map.ai_api_key),
      model: map.ai_model || "google/gemini-2.5-flash",
    });
  } catch (error: any) {
    console.error("[Get AI Settings Error]", error);
    return NextResponse.json({ error: "Gagal mengambil konfigurasi AI" }, { status: 500 });
  }
});

export const POST = withAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const { provider, apiKey, model } = body;

    if (provider !== undefined) {
      await prisma.appSetting.upsert({
        where: { key: "ai_provider" },
        update: { value: String(provider) },
        create: { key: "ai_provider", value: String(provider) },
      });
    }

    if (apiKey !== undefined && apiKey !== "••••••••••••••••") {
      await prisma.appSetting.upsert({
        where: { key: "ai_api_key" },
        update: { value: String(apiKey) },
        create: { key: "ai_api_key", value: String(apiKey) },
      });
    }

    if (model !== undefined) {
      await prisma.appSetting.upsert({
        where: { key: "ai_model" },
        update: { value: String(model) },
        create: { key: "ai_model", value: String(model) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Save AI Settings Error]", error);
    return NextResponse.json({ error: "Gagal menyimpan konfigurasi AI" }, { status: 500 });
  }
});
