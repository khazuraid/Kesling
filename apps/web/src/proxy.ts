import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { clientIp } from "@/lib/request-ip";
import { logSecurityEvent } from "@/lib/security-logger";

const LOGIN_RATE_LIMIT = 10; // per IP per menit
const LOGIN_WINDOW = 60_000;
const MAX_ENTRIES = 10_000;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
// Batas ini per IP, dan satu kantor puskesmas biasanya keluar lewat satu NAT.
// Angkanya sengaja longgar (hanya menahan banjir permintaan otomatis), bukan
// alat kuota per pengguna.
const API_RATE_LIMIT = 1200; // GET/HEAD per IP per menit
const WRITE_RATE_LIMIT = 300; // POST/PUT/PATCH/DELETE per IP per menit
const API_WINDOW = 60_000;

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const apiRateLimit = new Map<string, { count: number; resetAt: number }>();

function cleanupStaleEntries() {
  if (loginAttempts.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now > entry.resetAt) loginAttempts.delete(key);
  }
}

function cleanupApiEntries() {
  if (apiRateLimit.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of apiRateLimit) {
    if (now > entry.resetAt) apiRateLimit.delete(key);
  }
}

/**

 * Global API rate limit per IP+metode (lihat konstanta di atas).

 */

function rateLimitApi(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith("/api/")) return null;
  const ip = clientIp(req);
  // Kunci per-IP per-metode, bukan per-path: sebelumnya penyerang cukup
  // menyebar permintaan ke banyak endpoint untuk menghindari batas ini.
  const key = `${ip}:${req.method}`;
  const now = Date.now();
  const entry = apiRateLimit.get(key);

  if (!entry || now > entry.resetAt) {
    apiRateLimit.set(key, { count: 1, resetAt: now + API_WINDOW });
    cleanupApiEntries();
    return null;
  }

  entry.count++;
  const limit = req.method === "GET" || req.method === "HEAD" ? API_RATE_LIMIT : WRITE_RATE_LIMIT;
  if (entry.count > limit) {
    logSecurityEvent({
      eventType: "RATE_LIMIT",
      ip,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") || undefined,
      detail: `${entry.count} ${req.method} requests in ${API_WINDOW / 1000}s window (limit ${limit})`,
    });
    return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

function rateLimitLogin(req: NextRequest): NextResponse | null {
  if (req.method !== "POST" || !req.nextUrl.pathname.includes("/api/auth/callback")) return null;

  const ip = clientIp(req);
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW });
    cleanupStaleEntries();
    return null;
  }

  entry.count++;
  if (entry.count > LOGIN_RATE_LIMIT) {
    logSecurityEvent({
      eventType: "BRUTE_FORCE",
      ip,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") || undefined,
      detail: `${entry.count} login attempts in ${LOGIN_WINDOW / 1000}s window`,
    });
    return new NextResponse(JSON.stringify({ error: "Too many login attempts." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

async function logFailedLogin(req: NextRequest) {
  if (req.method !== "POST" || !req.nextUrl.pathname.includes("/api/auth/callback")) return;
  const ip = clientIp(req);
  const entry = loginAttempts.get(ip);
  if (entry && entry.count >= 3) {
    logSecurityEvent({
      eventType: "LOGIN_FAILED",
      ip,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") || undefined,
      detail: `${entry.count} failed attempts`,
    });
  }
}

/** Apply security headers to every response */
function applySecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com;",
  );
  return res;
}

function checkBodySize(req: NextRequest): NextResponse | null {
  if (req.method === "POST" || req.method === "PUT") {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
      return new NextResponse(JSON.stringify({ error: "Request too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
  return null;
}

/* Admin-only routes */
const ADMIN_ONLY_PREFIXES = [
  "/settings/users",
  "/laporan-builder",
  "/approval",
  "/api/laporan/approval",
  "/api/users",
  "/api/backup",
  "/api/restore",
  "/api/import",
  "/api/master/dynamic-formulas",
  "/api/master/dynamic-parameters",
  "/api/master/dynamic-subcategories",
  "/api/master/puskesmas",
  "/api/master/reorder",
  "/api/target",
  "/audit-log",
];

/**
 * Rantai keamanan + kontrol akses. Dipanggil dari dua tempat: ekspor default
 * (navigasi halaman) dan wrapper API di bawah — matcher /api/** tidak pernah
 * masuk ke ekspor default, jadi tanpa jalur kedua seluruh rate limit dan
 * pemeriksaan role di sini tidak akan pernah berjalan untuk route API.
 */
async function securityLayer(req: NextRequest): Promise<NextResponse> {
  const sizeLimit = checkBodySize(req);
  if (sizeLimit) return applySecurityHeaders(sizeLimit);

  const apiLimited = rateLimitApi(req);
  if (apiLimited) return applySecurityHeaders(apiLimited);

  const limited = rateLimitLogin(req);
  if (limited) return applySecurityHeaders(limited);

  logFailedLogin(req);

  const pathname = req.nextUrl.pathname;

  // Route API tidak boleh memakai cookie sesi untuk akses lintas-situs.
  const isMutation = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
  if (pathname.startsWith("/api/") && isMutation) {
    const origin = req.headers.get("origin");
    if (origin) {
      const host = req.headers.get("host");
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        return applySecurityHeaders(
          new NextResponse(JSON.stringify({ error: "Origin tidak valid" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (!host || originHost !== host) {
        logSecurityEvent({
          eventType: "SUSPICIOUS",
          ip: clientIp(req),
          path: pathname,
          userAgent: req.headers.get("user-agent") || undefined,
          detail: `Origin ${origin} tidak cocok dengan host ${host || "-"}`,
        });
        return applySecurityHeaders(
          new NextResponse(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
    }
  }

  const token = await getToken({ req });

  // Ganti password wajib setelah login pertama: sebelum diganti, permintaan
  // selain halaman profil & endpoint auth ditolak agar password sementara
  // tidak bisa dipakai untuk mengoperasikan aplikasi.
  if (token?.mustChangePassword && pathname.startsWith("/api/") && !API_ALLOWED_WHEN_PASSWORD_STALE(pathname)) {
    return applySecurityHeaders(
      new NextResponse(JSON.stringify({ error: "Password harus diganti terlebih dahulu" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  if (!token) return applySecurityHeaders(NextResponse.next());
  const role = token.role as string;

  // Daftar blokir hanya berlaku untuk OPERATOR; ADMIN dan DINKES (pengawas)
  // tetap boleh membaca halaman maupun endpoint tersebut.
  if (role === "OPERATOR") {
    for (const prefix of ADMIN_ONLY_PREFIXES) {
      if (pathname.startsWith(prefix)) {
        if (pathname.startsWith("/api/")) {
          return applySecurityHeaders(
            new NextResponse(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return applySecurityHeaders(NextResponse.redirect(new URL("/?error=forbidden", req.url)));
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

const API_ALLOWED_WHEN_PASSWORD_STALE = (pathname: string) =>
  pathname.startsWith("/api/auth") ||
  pathname.startsWith("/api/profile") ||
  pathname.startsWith("/api/mobile/v1/auth") ||
  pathname.startsWith("/api/health");

export default securityLayer;

export const config = {
  matcher: [
    "/((?!login|api/|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*|offline.html|workbox-.*).*)",
    "/api/:path*",
  ],
};
