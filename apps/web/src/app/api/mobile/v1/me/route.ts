import { type NextRequest, NextResponse } from "next/server";
import { getMobileUser, sanitizeMobileUser } from "@/lib/mobile-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getMobileUser(req);
    if (!user) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
    }

    const sanitizedUser = sanitizeMobileUser(user);
    return NextResponse.json(sanitizedUser);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal memuat profil." }, { status: 500 });
  }
}
