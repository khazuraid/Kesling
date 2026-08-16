import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { getLibur, setCustomLibur } from "@/lib/libur";

// GET: list semua hari libur untuk tahun
export const GET = withAuth(async (req: NextRequest) => {
  const year = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const data = await getLibur(year);
  return NextResponse.json({ tahun: year, data });
});

// POST: set custom holidays (replace all)
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.every((i: { tanggal?: string }) => typeof i.tanggal === "string")) {
    return NextResponse.json({ error: "Format tidak valid" }, { status: 400 });
  }
  await setCustomLibur(
    items.map((i: { tanggal: string; keterangan?: string }) => ({
      tanggal: i.tanggal,
      keterangan: i.keterangan || "Libur Custom",
    })),
  );
  return NextResponse.json({ success: true, count: items.length });
});

// DELETE: remove custom holidays for a date
export const DELETE = withAuth(async (req: NextRequest) => {
  const tanggal = req.nextUrl.searchParams.get("tanggal");
  if (!tanggal) return NextResponse.json({ error: "tanggal wajib" }, { status: 400 });
  const year = Number(req.nextUrl.searchParams.get("tahun")) || new Date().getFullYear();
  const all = await getLibur(year);
  const custom = all
    .filter((l) => l.sumber === "custom" && l.tanggal !== tanggal)
    .map(({ tanggal: t, keterangan: k }) => ({ tanggal: t, keterangan: k }));
  await setCustomLibur(custom);
  return NextResponse.json({ success: true });
});
