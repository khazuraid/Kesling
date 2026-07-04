import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getSecurityEvents } from "@/lib/security-logger";

export const GET = withAuth(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const page = Number(sp.get("page")) || 1;
  const limit = Number(sp.get("limit")) || 25;
  const eventType = sp.get("eventType") || "";
  const ip = sp.get("ip") || "";
  const dateFrom = sp.get("dateFrom") || "";
  const dateTo = sp.get("dateTo") || "";

  const data = await getSecurityEvents({ page, limit, eventType, ip, dateFrom, dateTo });
  return NextResponse.json(data);
});
