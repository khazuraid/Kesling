import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// Endpoint liveness untuk probe container, jadi tetap publik. Namun detail
// infrastruktur (db/redis mana yang mati) TIDAK lagi dikembalikan — cukup
// up/down, agar tidak membocorkan topologi. Detail lengkap ada di
// /api/admin/health yang ber-guard admin.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }

  try {
    await redis.ping();
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 200 });
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}
