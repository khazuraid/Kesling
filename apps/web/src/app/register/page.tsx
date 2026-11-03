"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  UserCheck,
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

interface PuskesmasOption {
  id: number;
  nama: string;
}

export default function RegisterPage() {
  // Step: "form" -> "otp" -> "pending_approval"
  const [step, setStep] = useState<"form" | "otp" | "pending_approval">("form");

  // Form inputs
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"OPERATOR" | "DINKES">("OPERATOR");
  const [puskesmasId, setPuskesmasId] = useState<string>("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileRef>(null);

  // OTP inputs
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Helper states
  const [puskesmasList, setPuskesmasList] = useState<PuskesmasOption[]>([]);
  const [loadingPuskesmas, setLoadingPuskesmas] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Load puskesmas list for role OPERATOR
  useEffect(() => {
    let ignore = false;
    async function loadPuskesmas() {
      setLoadingPuskesmas(true);
      try {
        const res = await fetch("/api/master/puskesmas");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setPuskesmasList(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Gagal memuat puskesmas:", err);
      } finally {
        if (!ignore) setLoadingPuskesmas(false);
      }
    }
    loadPuskesmas();
    return () => {
      ignore = true;
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Step 1: Submit Form Pendaftaran
  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    if (role === "OPERATOR" && !puskesmasId) {
      setError("Pilih Puskesmas tempat Anda bertugas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama,
          username,
          email,
          password,
          role,
          puskesmasId: role === "OPERATOR" ? Number(puskesmasId) : undefined,
          turnstileToken,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Gagal mendaftarkan akun.");
        turnstileRef.current?.reset();
        setTurnstileToken("");
        return;
      }

      setChallengeToken(data.challengeToken);
      setMaskedEmail(data.maskedEmail);
      setStep("otp");
    } catch {
      setLoading(false);
      setError("Terjadi kesalahan jaringan. Silakan periksa koneksi Anda.");
    }
  }

  // Handle Step 2: Submit OTP Verification
  async function handleOtpSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeToken,
          otp,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Kode verifikasi tidak valid.");
        return;
      }

      setStep("pending_approval");
    } catch {
      setLoading(false);
      setError("Gagal memverifikasi kode. Silakan coba lagi.");
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    if (cooldown > 0 || !challengeToken) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken }),
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
      <div className="w-full max-w-[480px] space-y-6">
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
          {step === "form" && (
            <>
              <div className="space-y-1 text-center sm:text-left">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Daftar Akun Baru</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Lengkapi data diri di bawah ini untuk mengajukan pendaftaran akses portal.
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="nama" className="text-xs font-medium text-foreground/80">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="nama"
                    type="text"
                    required
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    placeholder="Nama Lengkap Beserta Gelar"
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="username" className="text-xs font-medium text-foreground/80">
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="contoh: fikri_kesling"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground/80">
                      Alamat Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value.toLowerCase())}
                      placeholder="nama@email.com"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground/80">Peran Akun (Role)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("OPERATOR")}
                      className={`h-11 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                        role === "OPERATOR"
                          ? "bg-primary/10 border-primary text-primary shadow-xs"
                          : "bg-surface border-border text-muted-foreground hover:bg-surface-subtle"
                      }`}
                    >
                      Petugas Puskesmas
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("DINKES")}
                      className={`h-11 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                        role === "DINKES"
                          ? "bg-primary/10 border-primary text-primary shadow-xs"
                          : "bg-surface border-border text-muted-foreground hover:bg-surface-subtle"
                      }`}
                    >
                      Staf Dinas Kesehatan
                    </button>
                  </div>
                </div>

                {role === "OPERATOR" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="puskesmas" className="text-xs font-medium text-foreground/80">
                      Unit Kerja Puskesmas
                    </Label>
                    <select
                      id="puskesmas"
                      required
                      value={puskesmasId}
                      onChange={(e) => setPuskesmasId(e.target.value)}
                      disabled={loadingPuskesmas}
                      aria-label="Pilih Wilayah Puskesmas"
                      className="w-full h-11 px-3 text-sm bg-surface border border-input rounded-md text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">-- Pilih Wilayah Puskesmas --</option>
                      {puskesmasList.map((p) => (
                        <option key={p.id} value={p.id}>
                          Puskesmas {p.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground/80">
                      Kata Sandi
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                      Ulangi Sandi
                    </Label>
                    <Input
                      id="confirmPassword"
                      type={showPw ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Cloudflare Turnstile Verification */}
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
                      Mendaftarkan Akun...
                    </>
                  ) : (
                    <>
                      Lanjutkan Verifikasi Email
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border">
                  Sudah memiliki akun?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    Masuk di sini
                  </Link>
                </div>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="space-y-2 text-center sm:text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-foreground">Verifikasi Email</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Kami telah mengirimkan 6 digit kode OTP ke email pendaftaran Anda:{" "}
                  <span className="font-bold text-foreground">{maskedEmail}</span>
                </p>
              </div>

              <form onSubmit={handleOtpSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="py-2.5">
                    <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col items-center justify-center py-2 space-y-2">
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
                  <p className="text-[11px] text-muted-foreground">Kode berlaku selama 10 menit</p>
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
                      Verifikasi & Ajukan Akun
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("form");
                      setOtp("");
                      setError("");
                    }}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Ubah Data
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

          {step === "pending_approval" && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Email Berhasil Diverifikasi!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Pendaftaran akun Anda telah tercatat dan saat ini sedang menunggu persetujuan (approval) Administrator
                  Dinas Kesehatan.
                </p>
              </div>

              <div className="bg-surface-subtle border border-border rounded-xl p-4 text-left space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Tahap Persetujuan Manual</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Administrator Dinas Kesehatan akan meninjau dan mengaktifkan akun Anda. Pemberitahuan akan dikirim
                      ke email Anda segera setelah disetujui.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2 border-t border-border">
                  <UserCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Login Belum Dapat Dilakukan</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Sistem akan memblokir upaya masuk sampai akun Anda resmi berstatus AKTIF.
                    </p>
                  </div>
                </div>
              </div>

              <Link href="/login" className="block w-full">
                <Button variant="outline" className="w-full h-11 text-sm font-semibold">
                  Kembali ke Halaman Masuk
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
