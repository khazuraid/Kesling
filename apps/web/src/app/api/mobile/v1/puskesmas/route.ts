import { prisma } from "@apps-kes/database";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getMobileUser } from "@/lib/mobile-auth";

// GET list puskesmas — utk selector ADMIN/DINKES
export async function GET(req: NextRequest) {
  const user = await getMobileUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "DINKES") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const list = await prisma.puskesmas.findMany({
    select: { id: true, nama: true },
    orderBy: { nama: "asc" },
  });
  return NextResponse.json(list);
}
