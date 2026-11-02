"use client";

import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { Turnstile } from "@/components/turnstile";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/";

  let safeCallback = "/";
  if (rawCallback.startsWith("/") && !rawCallback.startsWith("//")) {
    safeCallback = rawCallback;
  } else {
    try {
      const parsed = new URL(rawCallback);
      if (
        typeof window !== "undefined" &&
        (parsed.origin === window.location.origin || parsed.hostname === "kesling.biz.id")
      ) {
        safeCallback = parsed.pathname + parsed.search;
      }
    } catch {}
  }

  // Step state: "credentials" atau "otp" (OTP dinonaktifkan sementara)
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [challengeToken, _setChallengeToken] = useState("");
  const [maskedEmail, _setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Cooldown countdown untuk kirim ulang OTP
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Login Langsung (Username/Email + Password + Turnstile)
  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email: identifier,
        password,
        turnstileToken,
        redirect: false,
        callbackUrl: safeCallback,
      });

      setLoading(false);

      if (res?.error) {
        setError(res.error);
      } else {
        window.location.href = safeCallback;
      }
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan jaringan. Silakan periksa koneksi internet Anda.");
    }
  }

  // Handle Tahap 2: Verifikasi 6-Digit OTP via NextAuth Provider
  async function handleOtpSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi dengan lengkap.");
      return;
    }

    setError("");
    setLoading(true);

    const res = await signIn("otp", {
      challengeToken,
      otp,
      redirect: false,
      callbackUrl: safeCallback,
    });

    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      window.location.href = safeCallback;
    }
  }

  // Handle Kirim Ulang OTP
  async function handleResendOtp() {
    if (cooldown > 0 || !challengeToken) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mengirim ulang kode.");
        return;
      }

      setCooldown(data.cooldownSeconds || 60);
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
          {step === "credentials" ? (
            <>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Masuk</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Masukkan email atau username beserta kata sandi akun Anda.
                </p>
              </div>

              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                {error && (
                  <Alert id="login-error" variant="destructive" className="py-2.5">
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
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="nama@puskesmas.go.id atau username"
                    aria-invalid={!!error}
                    aria-describedby={error ? "login-error" : undefined}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground/80">
                    Kata Sandi
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      aria-invalid={!!error}
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-11 pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Cloudflare Turnstile Verification */}
                <Turnstile
                  onSuccess={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileToken("")}
                  className="py-1"
                />

                <Button type="submit" disabled={loading} className="w-full h-11 gap-2 text-sm font-semibold shadow-xs">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memeriksa Kredensial...
                    </>
                  ) : (
                    <>
                      Masuk
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Step 2: 2FA OTP */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Verifikasi 2 Langkah</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Masukkan 6 digit kode verifikasi yang dikirimkan ke email terdaftar:{" "}
                  <span className="font-bold text-foreground">{maskedEmail}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {error && (
                  <Alert id="otp-error" variant="destructive" className="py-2.5">
                    <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(val) => {
                      setOtp(val);
                      if (val.length === 6) {
                        setError("");
                      }
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
                  <p className="text-[11px] text-muted-foreground">Kode kedaluwarsa dalam 5 menit</p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-11 gap-2 text-sm font-semibold shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      Konfirmasi & Masuk
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("credentials");
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
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-canvas">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
