import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config.mjs";

describe("mobile API CORS configuration", () => {
  it("allows browser clients to preflight every mobile API route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers?.();
    const mobile = rules?.find((rule) => rule.source === "/api/mobile/:path*");
    const headers = new Map(mobile?.headers.map((header) => [header.key, header.value]));

    expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
    expect(headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });
});
