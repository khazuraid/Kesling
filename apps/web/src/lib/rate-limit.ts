import { type NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";
import { logSecurityEvent } from "./security-logger";

interface RateLimitConfig {
  windowMs?: number; // default 60s
  max?: number; // default 60 requests
}

export async function rateLimit(req: NextRequest, config: RateLimitConfig = {}) {
  const { windowMs = 60_000, max = 60 } = config;
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
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
