import { describe, expect, it } from "vitest";
import { verifyWebhookSignature, verifyWebhookToken } from "../sumopod";

describe("SumoPod Webhook Verification", () => {
  describe("verifyWebhookToken", () => {
    it("should return true when tokens match", () => {
      expect(verifyWebhookToken("whtok_abc123", "whtok_abc123")).toBe(true);
    });

    it("should return false when tokens do not match", () => {
      expect(verifyWebhookToken("whtok_abc123", "whtok_wrong")).toBe(false);
    });

    it("should return false when expected token is missing", () => {
      expect(verifyWebhookToken(null, "whtok_abc123")).toBe(false);
    });
  });

  describe("verifyWebhookSignature (Svix HMAC-SHA256)", () => {
    const rawSecret = "whsec_52n9Qd+wE7l+mR+iF48eBq5uY3+20T+b8V0f+lB4u0M=";
    const svixId = "msg_2X5Y8...";
    const svixTimestamp = "1614555122";
    const rawBody = JSON.stringify({ event_type: "payment.success", amount: 50000 });

    it("should verify matching signature correctly", () => {
      // Hitung expected signature secara manual
      const crypto = require("node:crypto");
      const cleanSecret = rawSecret.replace("whsec_", "");
      const secretBytes = Buffer.from(cleanSecret, "base64");
      const expected = crypto
        .createHmac("sha256", secretBytes)
        .update(`${svixId}.${svixTimestamp}.${rawBody}`)
        .digest("base64");

      const headerSig = `v1,${expected}`;
      const isValid = verifyWebhookSignature(rawSecret, svixId, svixTimestamp, headerSig, rawBody);
      expect(isValid).toBe(true);
    });

    it("should support multiple space-separated signatures (key rotation scenario)", () => {
      const crypto = require("node:crypto");
      const cleanSecret = rawSecret.replace("whsec_", "");
      const secretBytes = Buffer.from(cleanSecret, "base64");
      const expected = crypto
        .createHmac("sha256", secretBytes)
        .update(`${svixId}.${svixTimestamp}.${rawBody}`)
        .digest("base64");

      const headerSig = `v1,oldSignature v1,${expected} v1,thirdSig`;
      const isValid = verifyWebhookSignature(rawSecret, svixId, svixTimestamp, headerSig, rawBody);
      expect(isValid).toBe(true);
    });

    it("should reject tampered body or invalid signature", () => {
      const headerSig = "v1,invalidBase64Signature=";
      const isValid = verifyWebhookSignature(rawSecret, svixId, svixTimestamp, headerSig, rawBody);
      expect(isValid).toBe(false);
    });
  });
});
