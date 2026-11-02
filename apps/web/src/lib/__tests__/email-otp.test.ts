import { describe, expect, it } from "vitest";
import { generateSecureOtp, maskEmail } from "../email-otp";

describe("Email OTP Utilities", () => {
  it("should generate a 6-digit numeric OTP", () => {
    const otp = generateSecureOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it("should properly mask various email formats", () => {
    expect(maskEmail("fikri@puskesmas.go.id")).toBe("f***i@puskesmas.go.id");
    expect(maskEmail("admin@dinkes.cirebon.go.id")).toBe("a***n@dinkes.cirebon.go.id");
    expect(maskEmail("ab@domain.com")).toBe("a***@domain.com");
    expect(maskEmail("invalid-email")).toBe("***@***");
  });
});
