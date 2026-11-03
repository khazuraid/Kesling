"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { TurnstileRef } from "@/components/turnstile";
import { Turnstile } from "@/components/turnstile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  // Step: "request" -> "reset" -> "success"
  const [step, setStep] = useState<"request" | "reset" | "success">("request");

  // Step 1 states
  const [identifier, setIdentifier] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);

  // Step 2 states
  const [resetToken, setResetToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Helper states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Step 1: Request OTP Reset
  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          turnstileToken,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal memproses permintaan reset kata sandi.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }

      setResetToken(data.resetToken);
      setMaskedEmail(data.maskedEmail);
      setStep("reset");
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.");
    }
  }

  // Handle Step 2: Reset Password with OTP
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Masukkan 6 digit kode OTP verifikasi.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          otp,
          newPassword,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mereset kata sandi.");
        return;
      }

      setStep("success");
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan saat menyimpan kata sandi baru.");
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    if (cooldown > 0 || !resetToken) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mengirim ulang kode OTP.");
        return;
      }

      setCooldown(60);
    } catch {
      setLoading(false);
      setError("Gagal menghubungi server untuk kirim ulang kode.");
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-canvas p-4 sm:p-6 text-foreground font-sans">
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-xs">
            <Image
              src="/logo.png"
              alt="Kesling Core"
              width={44}
              height={44}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-extrabold tracking-tight text-foreground">Kesling Core</h1>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Dinas Kesehatan Kota Cirebon
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="p-6 sm:p-8 space-y-6 shadow-subtle">
          {step === "request" && (
            <>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Lupa Kata Sandi</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Masukkan email atau username Anda untuk menerima kode OTP pemulihan kata sandi.
                </p>
              </div>

              <form onSubmit={handleRequestSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-xs font-medium text-foreground/80">
                    Email atau Username
                  </Label>
                  <Input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="nama@email.com atau username"
                    className="h-11"
                  />
                </div>

                {/* Cloudflare Turnstile */}
                <Turnstile
                  ref={turnstileRef}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                  className="py-1"
                />

                <Button type="submit" disabled={loading} className="w-full h-11 gap-2 text-sm font-semibold shadow-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Kirim Kode OTP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border">
                  Ingat kata sandi?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Kembali ke Masuk
                  </Link>
                </div>
              </form>
            </>
          )}

          {step === "reset" && (
            <>
              <div className="space-y-2 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Reset Kata Sandi</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Masukkan 6 digit kode OTP yang telah dikirim ke email:{" "}
                  <span className="font-bold text-foreground">{maskedEmail}</span>
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center justify-center py-1 space-y-1">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (val.length === 6) setError("");
                    }}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-10 h-12 text-base font-bold" />
                      <InputOTPSlot index={1} className="w-10 h-12 text-base font-bold" />
                      <InputOTPSlot index={2} className="w-10 h-12 text-base font-bold" />
                      <InputOTPSlot index={3} className="w-10 h-12 text-base font-bold" />
                      <InputOTPSlot index={4} className="w-10 h-12 text-base font-bold" />
                      <InputOTPSlot index={5} className="w-10 h-12 text-base font-bold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium text-foreground/80">
                    Kata Sandi Baru
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPw ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 karakter"
                      className="h-11 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground/80">
                    Konfirmasi Kata Sandi Baru
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPw ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi baru"
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-11 gap-2 text-sm font-semibold shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan Kata Sandi...
                    </>
                  ) : (
                    <>
                      Simpan Kata Sandi Baru
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("request");
                      setOtp("");
                      setError("");
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Ganti Akun
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    {cooldown > 0 ? `Kirim ulang (${cooldown}s)` : "Kirim Ulang"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Kata Sandi Diperbarui!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Kata sandi akun Anda telah berhasil diubah. Seluruh batas percobaan salah (rate-limit) telah
                  dibersihkan.
                </p>
              </div>

              <div className="bg-surface-subtle border border-border rounded-xl p-4 text-left flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Anda sekarang dapat masuk ke aplikasi menggunakan kata sandi yang baru saja Anda buat.
                </p>
              </div>

              <Link href="/login" className="block w-full">
                <Button className="w-full h-11 text-sm font-semibold shadow-xs">
                  Masuk Sekarang
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
