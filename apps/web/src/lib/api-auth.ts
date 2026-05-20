import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./session";

type RouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse>;

/** Wraps handler with try/catch for consistent error responses */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e: any) {
      const status = e?.code === "P2025" ? 404 : 500;
      return NextResponse.json({ error: e?.message || "Internal server error" }, { status });
    }
  };
}

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    (req as NextRequest & { user: typeof user }).user = user;
    return handler(req, ctx);
  };
}

export function withAdmin(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    (req as NextRequest & { user: typeof user }).user = user;
    return handler(req, ctx);
  };
}

/** For laporan write: operator can only write to their own puskesmas */
export function withLaporanAuth(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.clone().json();
      if (user.role === "OPERATOR" && user.puskesmasId && body.puskesmasId !== user.puskesmasId) {
        return NextResponse.json({ error: "Forbidden: bukan puskesmas Anda" }, { status: 403 });
      }
    }

    (req as NextRequest & { user: typeof user }).user = user;
    return handler(req, ctx);
  };
}
