import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW = 60_000; // ms

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimitLogin(req: NextRequest): NextResponse | null {
  if (req.method !== "POST" || !req.nextUrl.pathname.includes("/api/auth/callback")) return null;

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW });
    return null;
  }

  entry.count++;
  if (entry.count > LOGIN_RATE_LIMIT) {
    return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
  }
  return null;
}

export default withAuth(async function middleware(req) {
  const limited = rateLimitLogin(req);
  if (limited) return limited;
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!login|api/health|api/cron|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*|offline.html|workbox-.*).*)"],
};
