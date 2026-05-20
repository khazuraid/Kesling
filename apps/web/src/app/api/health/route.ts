import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function GET() {
  const health: { status: string; db: string; redis: string } = { status: "ok", db: "connected", redis: "connected" };
  let statusCode = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    health.status = "error";
    health.db = "disconnected";
    statusCode = 503;
  }

  try {
    await redis.ping();
  } catch {
    health.redis = "disconnected";
    if (health.status === "ok") health.status = "degraded";
  }

  return NextResponse.json(health, { status: statusCode });
}
