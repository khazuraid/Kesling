import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { logSecurityEvent } from "@/lib/security-logger";

const LOGIN_RATE_LIMIT = 5;
const LOGIN_WINDOW = 60_000;
const MAX_ENTRIES = 1000;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB
const API_RATE_LIMIT = 100; // max requests per minute per IP
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

/** Global API rate limit — 100 requests per minute per IP */
function rateLimitApi(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith("/api/")) return null;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const entry = apiRateLimit.get(ip);

  if (!entry || now > entry.resetAt) {
    apiRateLimit.set(ip, { count: 1, resetAt: now + API_WINDOW });
    cleanupApiEntries();
    return null;
  }

  entry.count++;
  if (entry.count > API_RATE_LIMIT) {
    logSecurityEvent({
      eventType: "RATE_LIMIT",
      ip,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get("user-agent") || undefined,
      detail: `${entry.count} requests in ${API_WINDOW / 1000}s window`,
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

  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
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
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'",
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

export default withAuth(async function middleware(req) {
  // Security: body size check
  const sizeLimit = checkBodySize(req);
  if (sizeLimit) return applySecurityHeaders(sizeLimit);

  // Security: global API rate limit
  const apiLimited = rateLimitApi(req);
  if (apiLimited) return applySecurityHeaders(apiLimited);

  // Security: rate limit login
  const limited = rateLimitLogin(req);
  if (limited) return applySecurityHeaders(limited);

  // Security: log failed logins
  logFailedLogin(req);

  // Role-based access
  const token = await getToken({ req });
  if (!token) return applySecurityHeaders(NextResponse.next());
  const pathname = req.nextUrl.pathname;
  const role = token.role as string;

  if (role === "OPERATOR") {
    for (const prefix of ADMIN_ONLY_PREFIXES) {
      if (pathname.startsWith(prefix)) {
        return applySecurityHeaders(NextResponse.redirect(new URL("/?error=forbidden", req.url)));
      }
    }
  }

  const res = NextResponse.next();
  return applySecurityHeaders(res);
});

export const config = {
  matcher: [
    "/((?!login|api/|_next/static|_next/image|favicon.ico|sw.js|manifest.json|icon-.*|offline.html|workbox-.*).*)",
  ],
};
