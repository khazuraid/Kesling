"use client";

import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setLoading(false);
    if (res?.error) {
      setError("Kredensial tidak valid. Silakan periksa kembali email atau sandi Anda.");
    } else {
      router.push(res?.url || "/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh flex font-sans text-[hsl(var(--foreground))] selection:bg-[hsl(var(--accent))/0.25]">
      {/* ─── Left: Dark Editorial Panel ─── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[hsl(162,32%,5%)]">
        {/* Layered radial gradients for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_30%_35%,hsl(160,60%,18%)_0%,transparent_55%),radial-gradient(ellipse_35%_45%_at_75%_60%,hsl(155,45%,13%)_0%,transparent_60%),radial-gradient(ellipse_50%_50%_at_50%_50%,hsl(160,25%,7%)_0%,transparent_100%)]" />

        {/* Subtle texture grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Geometric accent shapes */}
        <div className="absolute top-[14%] left-[16%] w-24 h-24 rounded-full border border-[hsl(160,55%,48%)]/25" />
        <div className="absolute top-[48%] right-[20%] w-[60px] h-[60px] rounded-xl border border-[hsl(160,50%,50%)]/15 rotate-[22deg]" />
        <div className="absolute bottom-[28%] left-[38%] w-32 h-32 rounded-full bg-[hsl(160,60%,50%)]/6 blur-3xl" />
        <div className="absolute top-[22%] right-[35%] w-48 h-48 rounded-full bg-[hsl(160,50%,40%)]/4 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full w-full py-20 px-20">
          {/* Top: Hero typography */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold tracking-[0.32em] uppercase text-[hsl(160,55%,62%)]/60">
              Dinas Kesehatan Kota Cirebon
            </p>
            <h1 className="text-[clamp(2.6rem,5vw,3.8rem)] font-black tracking-[-0.05em] leading-[0.82] text-white/95">
              Kesehatan
              <br />
              Lingkungan
            </h1>
            {/* Accent line group */}
            <div className="flex items-center gap-2 mt-5">
              <div className="h-[2px] w-14 rounded-full bg-[hsl(160,65%,52%)]" />
              <div className="h-[2px] w-7 rounded-full bg-[hsl(160,65%,52%)]/50" />
              <div className="h-[2px] w-3 rounded-full bg-[hsl(160,65%,52%)]/30" />
            </div>
          </div>

          {/* Center: Stats capsules */}
          <div className="flex gap-3 self-start">
            {[
              { val: "21", label: "Puskesmas" },
              { val: "56", label: "Parameter" },
              { val: "6", label: "Kategori" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-5 py-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
              >
                <div className="text-[1.65rem] font-black text-white/90 tracking-[-0.02em] leading-none">{s.val}</div>
                <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/25 mt-1.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom: Tagline + compliance */}
          <div className="max-w-xs space-y-3">
            <p className="text-white/60 text-sm leading-relaxed font-medium">
              Platform terpadu monitoring capaian indikator kesehatan lingkungan. Form dinamis real-time, rekapitulasi
              otomatis, audit trail terintegrasi.
            </p>
            <div className="flex items-center gap-3">
              <div className="compliance-bar max-w-[160px]">
                <div className="compliance-bar-fill w-[78%] bg-[hsl(160,60%,52%)]" />
              </div>
              <span className="text-[10px] font-bold text-[hsl(160,55%,62%)] tracking-[0.15em] uppercase">
                78% capaian
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: Clean Form Panel ─── */}
      <div className="w-full lg:w-[520px] flex flex-col justify-between relative z-10 bg-[hsl(var(--background))]">
        {/* Logo bar */}
        <div className="flex items-center gap-3 px-8 md:px-12 pt-8 md:pt-12">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent))]/8 border border-[hsl(var(--accent))]/15 flex items-center justify-center">
            <span className="text-sm font-black text-[hsl(var(--accent))] tracking-[-0.02em]">KC</span>
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-tight text-[hsl(var(--foreground))]">Kesling Core</p>
            <p className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]/50 tracking-[0.15em] uppercase">
              v1.0
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-[380px] w-full mx-auto my-auto px-8 md:px-12 py-6">
          <div className="mb-9 space-y-1">
            <h2 className="text-[2rem] font-black tracking-[-0.04em] text-[hsl(var(--foreground))] leading-tight">
              Masuk
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))]/60 font-medium leading-relaxed">
              Masukkan kredensial Anda untuk mengakses portal pelaporan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[hsl(var(--error))/0.06] border border-[hsl(var(--error))/0.12]">
                <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--error))] shrink-0" />
                <p className="text-[13px] text-[hsl(var(--error))] font-semibold leading-snug">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-[hsl(var(--muted-foreground))]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan alamat email"
                required
                className="w-full h-[50px] px-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/35 outline-none transition-all duration-200 focus:border-[hsl(var(--accent))]/45 focus:ring-[3px] focus:ring-[hsl(var(--accent))/0.06]"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-[10px] font-bold tracking-[0.12em] uppercase text-[hsl(var(--muted-foreground))]"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full h-[50px] px-4 pr-12 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/35 outline-none transition-all duration-200 focus:border-[hsl(var(--accent))]/45 focus:ring-[3px] focus:ring-[hsl(var(--accent))/0.06]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[hsl(var(--muted-foreground))]/40 hover:text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.08] transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] flex items-center justify-center gap-2.5 rounded-xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-sm font-bold tracking-tight transition-all duration-200 hover:opacity-85 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Lanjutkan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Secure badge */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]/30" />
            <p className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]/30 tracking-tight">
              Koneksi terenkripsi
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-8 md:px-12 pb-8 md:pb-12">
          <p className="text-[9px] font-semibold text-[hsl(var(--muted-foreground))]/35 tracking-[0.18em] uppercase">
            &copy; {new Date().getFullYear()} Dinas Kesehatan Kota Cirebon
          </p>
          <span className="text-[9px] text-[hsl(var(--muted-foreground))]/15">&middot;</span>
          <p className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]/25">All rights reserved</p>
        </div>
      </div>
    </div>
  );
}
