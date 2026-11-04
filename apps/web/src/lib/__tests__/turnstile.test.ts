import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "../turnstile";

describe("Turnstile Token Verification", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("should bypass verification if TURNSTILE_SECRET_KEY is not set (graceful dev fallback)", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const result = await verifyTurnstileToken("");
    expect(result.success).toBe(true);
  });

  it("should fail if TURNSTILE_SECRET_KEY is set but token is empty", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const result = await verifyTurnstileToken("");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Turnstile");
  });

  it("should return success when Cloudflare API responds with success: true", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);

    const result = await verifyTurnstileToken("valid-token", "127.0.0.1");
    expect(result.success).toBe(true);
  });

  it("should return failure when Cloudflare API responds with success: false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    } as unknown as Response);

    const result = await verifyTurnstileToken("invalid-token", "127.0.0.1");
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid-input-response");
  });
});
