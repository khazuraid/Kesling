import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { redis } from "./redis";

// Buat transporter SMTP dari environment variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || `"Kesling Core - Dinkes Cirebon" <no-reply@kesling.biz.id>`;

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * Sensor email untuk tampilan UI keamanan
 * Contoh: fikri.ramadhan@puskesmas.go.id -> f***n@puskesmas.go.id
 */
export function maskEmail(email: string): string {
  if (!email?.includes("@")) return "***@***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Generate 6-digit OTP kriptografis aman
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Kirim email OTP dengan fallback dev log jika SMTP belum dikonfigurasi
 */
export async function sendOtpEmail(toEmail: string, otp: string, userName: string): Promise<boolean> {
  const subject = `Kode Keamanan Login: ${otp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.02em;">Kesling Core</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dinas Kesehatan Kota Cirebon</p>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Halo, ${userName}</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
          Gunakan kode verifikasi berikut untuk menyelesaikan proses masuk ke portal Kesling Core. Kode ini hanya berlaku selama <strong>5 menit</strong>.
        </p>

        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #059669; background-color: #ecfdf5; border: 1px solid rgba(5, 150, 105, 0.2); padding: 14px 28px; border-radius: 10px; font-family: monospace;">
            ${otp}
          </div>
        </div>

        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
          Jangan berikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari Dinas Kesehatan.
        </p>
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          Jika Anda tidak merasa melakukan percobaan masuk, silakan abaikan email ini atau segera ubah kata sandi akun Anda.
        </p>
      </div>

      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon. Dilindungi sistem keamanan 2FA.
        </p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to: toEmail,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error("[Email OTP] Gagal mengirim email via SMTP:", err);
      // Fallback log saat SMTP gagal kirim
      console.info(`[Email OTP Fallback Log] Target: ${toEmail} | Kode OTP: ${otp}`);
      return false;
    }
  }

  // Jika SMTP belum di-setting (misal di local dev)
  console.info(`=======================================================`);
  console.info(`[DEV SMTP NOT CONFIGURED] Kode OTP Login untuk ${toEmail}:`);
  console.info(`>>> OTP: ${otp} <<<`);
  console.info(`=======================================================`);
  return true;
}

export interface StoredOtpChallenge {
  userId: number;
  email: string;
  otp: string;
  attempts: number;
}

/**
 * Simpan data OTP challenge di Redis (TTL 5 menit)
 */
export async function createOtpChallenge(
  userId: number,
  email: string,
): Promise<{ challengeToken: string; otp: string }> {
  const challengeToken = crypto.randomUUID();
  const otp = generateSecureOtp();
  const key = `otp:challenge:${challengeToken}`;
  const data: StoredOtpChallenge = {
    userId,
    email,
    otp,
    attempts: 0,
  };

  // Simpan selama 300 detik (5 menit)
  await redis.set(key, JSON.stringify(data), "EX", 300);
  return { challengeToken, otp };
}

/**
 * Ambil dan verifikasi OTP dari Redis
 */
export async function verifyOtpChallenge(
  challengeToken: string,
  inputOtp: string,
): Promise<{ success: boolean; error?: string; userId?: number; email?: string }> {
  const key = `otp:challenge:${challengeToken}`;
  const raw = await redis.get(key);

  if (!raw) {
    return { success: false, error: "Kode verifikasi telah kadaluarsa atau tidak valid. Silakan masuk kembali." };
  }

  let data: StoredOtpChallenge;
  try {
    data = JSON.parse(raw);
  } catch {
    return { success: false, error: "Sesi verifikasi rusak. Silakan ulangi login." };
  }

  if (data.attempts >= 3) {
    await redis.del(key);
    return { success: false, error: "Terlalu banyak percobaan kode salah. Silakan minta kode baru." };
  }

  if (data.otp !== inputOtp.trim()) {
    data.attempts += 1;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      await redis.set(key, JSON.stringify(data), "EX", ttl);
    }
    const sisa = 3 - data.attempts;
    return {
      success: false,
      error: sisa > 0 ? `Kode verifikasi salah. Tersisa ${sisa} kali kesempatan.` : "Batas percobaan kode tercapai.",
    };
  }

  // Sukses verifikasi — hapus OTP dari Redis agar tidak bisa dipakai ulang
  await redis.del(key);
  return { success: true, userId: data.userId, email: data.email };
}
