import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/api-auth";

// GET system error logs
export const GET = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "100");
    const offset = Number(searchParams.get("offset") || "0");

    const logs = await prisma.systemErrorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });

    const total = await prisma.systemErrorLog.count();

    return NextResponse.json({ logs, total });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch error logs" }, { status: 500 });
  }
});

// DELETE to clear all or specific log
export const DELETE = withAdmin(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      await prisma.systemErrorLog.delete({
        where: { id: Number(id) },
      });
      return NextResponse.json({ success: true, message: "Log berhasil dihapus" });
    }

    // Clear all logs
    await prisma.systemErrorLog.deleteMany();
    return NextResponse.json({ success: true, message: "Semua log berhasil dibersihkan" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete error logs" }, { status: 500 });
  }
});
