import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { withAdmin, withAuth, withLaporanAuth } from "@/lib/api-auth";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from "@/lib/session";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("withAuth", () => {
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const wrapped = withAuth(handler);
    const res = await wrapped(new NextRequest("http://localhost/api/test"), {});
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler if user exists", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: "OPERATOR", puskesmasId: 1 });
    const wrapped = withAuth(handler);
    await wrapped(new NextRequest("http://localhost/api/test"), {});
    expect(handler).toHaveBeenCalled();
  });
});

describe("withAdmin", () => {
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if no user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await withAdmin(handler)(new NextRequest("http://localhost/api/test"), {});
    expect(res.status).toBe(401);
  });

  it("returns 403 if not admin", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: "OPERATOR", puskesmasId: 1 });
    const res = await withAdmin(handler)(new NextRequest("http://localhost/api/test"), {});
    expect(res.status).toBe(403);
  });

  it("calls handler if admin", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: "ADMIN", puskesmasId: null });
    await withAdmin(handler)(new NextRequest("http://localhost/api/test"), {});
    expect(handler).toHaveBeenCalled();
  });
});

describe("withLaporanAuth", () => {
  const handler = vi.fn(async () => NextResponse.json({ ok: true }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 if operator writes to different puskesmas", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 2, role: "OPERATOR", puskesmasId: 1 });
    const req = new NextRequest("http://localhost/api/laporan/tpp", {
      method: "POST",
      body: JSON.stringify({ puskesmasId: 99 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await withLaporanAuth(handler)(req, {});
    expect(res.status).toBe(403);
  });

  it("allows operator to write to own puskesmas", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 2, role: "OPERATOR", puskesmasId: 1 });
    const req = new NextRequest("http://localhost/api/laporan/tpp", {
      method: "POST",
      body: JSON.stringify({ puskesmasId: 1 }),
      headers: { "Content-Type": "application/json" },
    });
    await withLaporanAuth(handler)(req, {});
    expect(handler).toHaveBeenCalled();
  });

  it("allows admin to write to any puskesmas", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, role: "ADMIN", puskesmasId: null });
    const req = new NextRequest("http://localhost/api/laporan/tpp", {
      method: "POST",
      body: JSON.stringify({ puskesmasId: 99 }),
      headers: { "Content-Type": "application/json" },
    });
    await withLaporanAuth(handler)(req, {});
    expect(handler).toHaveBeenCalled();
  });
});
