import { prisma } from "@apps-kes/database";
import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "./session";

type RouteHandler = (req: NextRequest, ctx: any) => Promise<NextResponse>;

async function logErrorToDb(e: any, req: NextRequest) {
  try {
    const user = await getCurrentUser().catch(() => null);
    const path = req.nextUrl.pathname + req.nextUrl.search;

    await prisma.systemErrorLog.create({
      data: {
        message: e?.message || String(e || "Unknown Error"),
        stack: e?.stack || null,
        path,
        userId: user?.id || null,
        userEmail: user?.email || null,
      },
    });
  } catch (err) {
    console.error("Gagal menulis log error ke database:", err);
  }
}

/** Wraps handler with try/catch for consistent error responses — never leaks internal errors */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e: any) {
      console.error("[API Error]", e);
      await logErrorToDb(e, req);

      const status = e?.code === "P2025" ? 404 : 500;
      const message = status === 404 ? "Data tidak ditemukan" : "Terjadi kesalahan server";
      return NextResponse.json({ error: message }, { status });
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

export function withRoles(roles: string[], handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!roles.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
