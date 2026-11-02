import { type NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";
import { clientIp } from "./request-ip";
import { logSecurityEvent } from "./security-logger";

interface RateLimitConfig {
  windowMs?: number; // default 60s
  max?: number; // default 60 requests
}

export async function rateLimit(req: NextRequest, config: RateLimitConfig = {}) {
  const { windowMs = 60_000, max = 60 } = config;
  const ip = clientIp(req);
  const key = `rl:${ip}:${req.nextUrl.pathname}`;
  const windowSec = Math.ceil(windowMs / 1000);

  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);
    if (current > max) {
      // Log rate limit hit
      logSecurityEvent({
        eventType: "RATE_LIMIT",
        ip,
        path: req.nextUrl.pathname,
        userAgent: req.headers.get("user-agent") || undefined,
        detail: `${current} requests in ${windowSec}s window (limit: ${max})`,
      });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  } catch {
    // Redis down — allow request through
  }
  return null;
}

type RouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse>;

export function withRateLimit(handler: RouteHandler, config?: RateLimitConfig): RouteHandler {
  return async (req, ctx) => {
    const limited = await rateLimit(req, config);
    if (limited) return limited;
    return handler(req, ctx);
  };
}

/**
 * Cek dan catat brute force login via Redis (Per-IP dan Per-Email).
 * Mengembalikan:
 * - isBlocked: true jika sudah mencapai batas maksimal gagal
 * - remainingAttempts: sisa percobaan
 * - isLockedOut: jika akun/IP terkunci
 */
export async function checkLoginRateLimit(identifier: string, type: "ip" | "email") {
  const maxAttempts = type === "ip" ? 15 : 5;
  const key = `login_fail:${type}:${identifier.toLowerCase().trim()}`;

  try {
    const attempts = await redis.get(key);
    const count = attempts ? parseInt(attempts, 10) : 0;

    return {
      isBlocked: count >= maxAttempts,
      remainingAttempts: Math.max(0, maxAttempts - count),
      currentAttempts: count,
      maxAttempts,
    };
  } catch {
    return { isBlocked: false, remainingAttempts: maxAttempts, currentAttempts: 0, maxAttempts };
  }
}

export async function recordFailedLogin(identifier: string, type: "ip" | "email") {
  const windowSec = 15 * 60; // 15 menit
  const key = `login_fail:${type}:${identifier.toLowerCase().trim()}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSec);
    return current;
  } catch {
    return 0;
  }
}

export async function clearLoginRateLimit(identifier: string, type: "ip" | "email") {
  const key = `login_fail:${type}:${identifier.toLowerCase().trim()}`;
  try {
    await redis.del(key);
  } catch {}
}
