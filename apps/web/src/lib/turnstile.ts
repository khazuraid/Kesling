interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verifikasi token Cloudflare Turnstile dari backend
 * Dokumentasi: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Jika Turnstile secret key belum dikonfigurasi di environment, izinkan lolos (graceful fallback untuk dev lokal)
  if (!secretKey) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Verifikasi keamanan (Turnstile) diperlukan." };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp && remoteIp !== "unknown") {
      formData.append("remoteip", remoteIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!res.ok) {
      return { success: false, error: "Gagal menghubungi server verifikasi Cloudflare." };
    }

    const data: TurnstileVerifyResponse = await res.json();
    if (!data.success) {
      return {
        success: false,
        error: "Verifikasi Cloudflare gagal atau kedaluwarsa. Silakan ulangi.",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("[Turnstile] Verification error:", error);
    return { success: false, error: "Terjadi kesalahan sistem saat memvalidasi Turnstile." };
  }
}
