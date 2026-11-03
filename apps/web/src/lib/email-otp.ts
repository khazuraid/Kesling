import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { redis } from "./redis";

// Buat transporter SMTP dari environment variables
// Mendukung format standard (SMTP_*) dan format Laravel/Sumopod (MAIL_*)
const smtpHost = process.env.MAIL_HOST || process.env.SMTP_HOST;
const smtpPort = Number(process.env.MAIL_PORT || process.env.SMTP_PORT || "465");
const smtpUser = process.env.MAIL_USERNAME || process.env.SMTP_USER;
const smtpPass = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;

const defaultFromName = process.env.MAIL_FROM_NAME || "Kesling Core - Dinkes Cirebon";
const defaultFromAddress = process.env.MAIL_FROM_ADDRESS || "no-reply@kesling.biz.id";
const smtpFrom =
  process.env.SMTP_FROM ||
  (process.env.MAIL_FROM_ADDRESS
    ? `"${defaultFromName}" <${defaultFromAddress}>`
    : `"${defaultFromName}" <no-reply@kesling.biz.id>`);

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  const isSecure = process.env.MAIL_ENCRYPTION?.toLowerCase() === "ssl" || smtpPort === 465;

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
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
 * Helper internal untuk kirim email generik
 */
async function sendRawEmail({
  to,
  subject,
  html,
  fallbackLog,
}: {
  to: string;
  subject: string;
  html: string;
  fallbackLog?: string;
}): Promise<boolean> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        html,
      });
      return true;
    } catch (err) {
      console.error("[Email] Gagal mengirim email via SMTP:", err);
      if (fallbackLog) console.info(fallbackLog);
      return false;
    }
  }

  if (fallbackLog) {
    console.info(`=======================================================`);
    console.info(`[DEV SMTP NOT CONFIGURED]`);
    console.info(fallbackLog);
    console.info(`=======================================================`);
  }
  return true;
}

/**
 * Kirim email OTP login
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
          Gunakan kode verifikasi berikut untuk menyelesaikan proses masuk ke portal Kesling Core. Kode ini berlaku selama <strong>5 menit</strong>.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #059669; background-color: #ecfdf5; border: 1px solid rgba(5, 150, 105, 0.2); padding: 14px 28px; border-radius: 10px; font-family: monospace;">
            ${otp}
          </div>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
          Jangan berikan kode ini kepada siapa pun, termasuk pihak yang mengaku dari Dinas Kesehatan.
        </p>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon. Dilindungi sistem keamanan 2FA.
        </p>
      </div>
    </div>
  `;
  return sendRawEmail({
    to: toEmail,
    subject,
    html,
    fallbackLog: `Target Login: ${toEmail} | OTP Login: ${otp}`,
  });
}

/**
 * Kirim email OTP pendaftaran baru
 */
export async function sendVerificationOtpEmail(toEmail: string, otp: string, userName: string): Promise<boolean> {
  const subject = `Kode Verifikasi Pendaftaran: ${otp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.02em;">Kesling Core</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dinas Kesehatan Kota Cirebon</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Selamat Datang, ${userName}</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
          Terima kasih telah mendaftar di sistem informasi Kesling Core. Masukkan kode verifikasi 6 digit berikut untuk memverifikasi alamat email Anda:
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #059669; background-color: #ecfdf5; border: 1px solid rgba(5, 150, 105, 0.2); padding: 14px 28px; border-radius: 10px; font-family: monospace;">
            ${otp}
          </div>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
          Kode ini berlaku selama <strong>10 menit</strong>. Setelah verifikasi email selesai, pendaftaran Anda akan ditinjau oleh Administrator Dinas Kesehatan.
        </p>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon.
        </p>
      </div>
    </div>
  `;
  return sendRawEmail({
    to: toEmail,
    subject,
    html,
    fallbackLog: `Target Register: ${toEmail} | OTP Register: ${otp}`,
  });
}

/**
 * Kirim email OTP reset kata sandi (lupa password)
 */
export async function sendPasswordResetOtpEmail(toEmail: string, otp: string, userName: string): Promise<boolean> {
  const subject = `Kode Reset Kata Sandi: ${otp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #dc2626; letter-spacing: -0.02em;">Kesling Core</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Permintaan Reset Kata Sandi</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Halo, ${userName}</p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.5;">
          Kami menerima permintaan untuk mereset kata sandi akun Kesling Core Anda. Gunakan kode verifikasi 6 digit berikut:
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <div style="display: inline-block; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #dc2626; background-color: #fef2f2; border: 1px solid rgba(220, 38, 38, 0.2); padding: 14px 28px; border-radius: 10px; font-family: monospace;">
            ${otp}
          </div>
        </div>
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; line-height: 1.5;">
          Kode berlaku selama <strong>10 menit</strong>. Jika Anda tidak merasa meminta reset kata sandi, abaikan email ini dan pastikan akun Anda tetap aman.
        </p>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon.
        </p>
      </div>
    </div>
  `;
  return sendRawEmail({
    to: toEmail,
    subject,
    html,
    fallbackLog: `Target Reset PW: ${toEmail} | OTP Reset PW: ${otp}`,
  });
}

/**
 * Notifikasi email akun telah disetujui Admin
 */
export async function sendRegistrationApprovedEmail(
  toEmail: string,
  userName: string,
  role: string,
  puskesmasNama?: string,
): Promise<boolean> {
  const subject = `Pendaftaran Akun Disetujui - Kesling Core`;
  const infoTambahan = puskesmasNama
    ? `<p style="margin: 0 0 10px; font-size: 13px; color: #475569;"><strong>Wilayah Kerja:</strong> Puskesmas ${puskesmasNama}</p>`
    : "";
  const loginUrl = process.env.NEXTAUTH_URL || "https://kesling.biz.id";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #059669; letter-spacing: -0.02em;">Kesling Core</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dinas Kesehatan Kota Cirebon</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Halo, ${userName}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.5;">
          Kabar baik! Pendaftaran akun Anda telah ditinjau dan <strong>DISETUJUI</strong> oleh Administrator Dinas Kesehatan.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 6px; font-size: 13px; color: #475569;"><strong>Role:</strong> ${role}</p>
          ${infoTambahan}
          <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Status Akun:</strong> <span style="color: #059669; font-weight: bold;">AKTIF</span></p>
        </div>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${loginUrl}/login" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px;">
            Masuk ke Aplikasi
          </a>
        </div>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon.
        </p>
      </div>
    </div>
  `;
  return sendRawEmail({
    to: toEmail,
    subject,
    html,
    fallbackLog: `Target Approved: ${toEmail} | Akun Disetujui`,
  });
}

/**
 * Notifikasi email akun ditolak Admin
 */
export async function sendRegistrationRejectedEmail(
  toEmail: string,
  userName: string,
  reason?: string,
): Promise<boolean> {
  const subject = `Pemberitahuan Status Pendaftaran - Kesling Core`;
  const alasanText = reason
    ? `<p style="margin: 0; font-size: 13px; color: #dc2626;"><strong>Alasan:</strong> ${reason}</p>`
    : "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #dc2626; letter-spacing: -0.02em;">Kesling Core</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Dinas Kesehatan Kota Cirebon</p>
      </div>
      <div style="border-top: 1px solid #f1f5f9; padding-top: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1e293b;">Halo, ${userName}</p>
        <p style="margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.5;">
          Mohon maaf, permohonan pendaftaran akun Anda saat ini <strong>BELUM DAPAT DISETUJUI</strong> oleh Administrator Dinas Kesehatan.
        </p>
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          ${alasanText}
        </div>
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Silakan hubungi penanggung jawab program atau Administrator Dinas Kesehatan untuk informasi lebih lanjut.
        </p>
      </div>
      <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dinas Kesehatan Kota Cirebon.
        </p>
      </div>
    </div>
  `;
  return sendRawEmail({
    to: toEmail,
    subject,
    html,
    fallbackLog: `Target Rejected: ${toEmail} | Alasan: ${reason}`,
  });
}

export interface StoredOtpChallenge {
  userId: number;
  email: string;
  otp: string;
  attempts: number;
}

/**
 * Simpan data OTP challenge login di Redis (TTL 5 menit)
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

  await redis.set(key, JSON.stringify(data), "EX", 300);
  return { challengeToken, otp };
}

/**
 * Verifikasi OTP login dari Redis
 */
export async function verifyOtpChallenge(
  challengeToken: string,
  inputOtp: string,
): Promise<{ success: boolean; error?: string; userId?: number; email?: string }> {
  return verifyGenericOtp(`otp:challenge:${challengeToken}`, inputOtp);
}

/**
 * Simpan OTP Pendaftaran (TTL 10 menit = 600 detik)
 */
export async function createRegisterOtpChallenge(
  userId: number,
  email: string,
): Promise<{ challengeToken: string; otp: string }> {
  const challengeToken = crypto.randomUUID();
  const otp = generateSecureOtp();
  const key = `otp:register:${challengeToken}`;
  const data: StoredOtpChallenge = {
    userId,
    email,
    otp,
    attempts: 0,
  };

  await redis.set(key, JSON.stringify(data), "EX", 600);
  return { challengeToken, otp };
}

/**
 * Verifikasi OTP Pendaftaran
 */
export async function verifyRegisterOtpChallenge(
  challengeToken: string,
  inputOtp: string,
): Promise<{ success: boolean; error?: string; userId?: number; email?: string }> {
  return verifyGenericOtp(`otp:register:${challengeToken}`, inputOtp);
}

/**
 * Simpan OTP Reset Password (TTL 10 menit = 600 detik)
 */
export async function createPasswordResetChallenge(
  userId: number,
  email: string,
): Promise<{ resetToken: string; otp: string }> {
  const resetToken = crypto.randomUUID();
  const otp = generateSecureOtp();
  const key = `otp:reset:${resetToken}`;
  const data: StoredOtpChallenge = {
    userId,
    email,
    otp,
    attempts: 0,
  };

  await redis.set(key, JSON.stringify(data), "EX", 600);
  return { resetToken, otp };
}

/**
 * Verifikasi OTP Reset Password
 */
export async function verifyPasswordResetChallenge(
  resetToken: string,
  inputOtp: string,
): Promise<{ success: boolean; error?: string; userId?: number; email?: string }> {
  return verifyGenericOtp(`otp:reset:${resetToken}`, inputOtp);
}

async function verifyGenericOtp(
  key: string,
  inputOtp: string,
): Promise<{ success: boolean; error?: string; userId?: number; email?: string }> {
  const raw = await redis.get(key);

  if (!raw) {
    return { success: false, error: "Kode verifikasi telah kadaluarsa atau tidak valid. Silakan minta kode baru." };
  }

  let data: StoredOtpChallenge;
  try {
    data = JSON.parse(raw);
  } catch {
    return { success: false, error: "Sesi verifikasi rusak. Silakan ulangi proses." };
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
