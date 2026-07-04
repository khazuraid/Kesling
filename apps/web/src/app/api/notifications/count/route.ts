import { prisma } from "@apps-kes/database";
import { NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/redis";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  const cacheKey = `notif:count:${user.id}`;
  try {
    const cached = await cacheGet<{ count: number }>(cacheKey);
    if (cached) return NextResponse.json(cached);
  } catch {}

  const count = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  const data = { count };
  try {
    await cacheSet(cacheKey, data, 5);
  } catch {}

  return NextResponse.json(data);
}
