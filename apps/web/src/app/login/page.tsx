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
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/" });
    setLoading(false);
    if (res?.error) {
      setError("Kredensial tidak valid. Silakan periksa kembali email atau sandi Anda.");
    } else {
      router.push(res?.url || "/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-dvh flex font-sans text-[#1B1917]">
      {/* ─── Left: Dark hero panel — Industrial Premium teal ─── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[#0C1B16]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_30%_35%,#123527_0%,transparent_55%),radial-gradient(ellipse_40%_45%_at_75%_60%,#0E2A1F_0%,transparent_60%)]" />
        {/* Blob teal seperti hero mobile */}
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#00A876] opacity-[0.14]" />
        <div className="absolute bottom-[18%] left-[30%] w-40 h-40 rounded-full bg-[#00A876] opacity-[0.07]" />

        <div className="relative z-10 flex flex-col justify-between h-full w-full py-16 px-16">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#7CF5CE]/60 mb-6">
              Dinas Kesehatan · Kota Cirebon
            </p>
            <h1 className="text-[72px] font-black leading-[0.9] tracking-[-0.04em] text-white">
              Kesehatan
              <br />
              Lingkungan
            </h1>
            <div className="flex items-center gap-2 mt-6">
              <div className="h-1 w-14 rounded-full bg-[#00A876]" />
              <div className="h-1 w-7 rounded-full bg-[#00A876]/50" />
              <div className="h-1 w-3 rounded-full bg-[#00A876]/30" />
            </div>
          </div>

          <div className="flex gap-3">
            {[
              { val: "21", label: "Puskesmas" },
              { val: "6", label: "Kategori" },
              { val: "78%", label: "Capaian" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm"
              >
                <div className="text-2xl font-black text-white/90 leading-none tabular-nums">{s.val}</div>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/30 mt-2">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-xs space-y-3">
            <p className="text-white/55 text-sm leading-relaxed font-medium">
              Platform terpadu monitoring capaian indikator kesehatan lingkungan. Form dinamis, rekapitulasi otomatis,
              audit trail terintegrasi.
            </p>
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 max-w-[160px] rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-[78%] rounded-full bg-[#BEF264]" />
              </div>
              <span className="text-[10px] font-extrabold text-[#BEF264] tracking-[0.15em] uppercase">78% capaian</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right: warm paper form panel ─── */}
      <div className="w-full lg:w-[520px] flex flex-col justify-between relative z-10 bg-[#F7F5F2]">
        <div className="flex items-center gap-3 px-8 md:px-12 pt-8 md:pt-12">
          <div className="w-10 h-10 rounded-[14px] bg-[#00A876] flex items-center justify-center shadow-[0_4px_12px_rgba(0,168,118,0.3)]">
            <span className="text-sm font-black text-[#06281E]">KC</span>
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-extrabold tracking-tight">Kesling Core</p>
            <p className="text-[9px] font-bold text-[#1B1917]/40 uppercase tracking-[0.2em]">v1.0</p>
          </div>
        </div>

        <div className="max-w-[380px] w-full mx-auto my-auto px-8 md:px-12 py-6">
          <div className="mb-9 space-y-1.5">
            <h2 className="text-[32px] font-black tracking-[-0.03em] leading-tight">Masuk</h2>
            <p className="text-sm text-[#1B1917]/50 font-medium leading-relaxed">
              Masukkan kredensial Anda untuk mengakses portal pelaporan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#DC2626]/[0.06] border border-[#DC2626]/15">
                <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0" />
                <p className="text-[12px] text-[#DC2626] font-semibold leading-snug">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1B1917]/50"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@puskesmas.go.id"
                className="w-full h-12 px-4 rounded-2xl bg-white border border-[#1B1917]/10 text-sm font-medium placeholder:text-[#1B1917]/30 outline-none transition-all duration-200 focus:border-[#00A876]/50 focus:ring-4 focus:ring-[#00A876]/10"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1B1917]/50"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-12 rounded-2xl bg-white border border-[#1B1917]/10 text-sm font-medium placeholder:text-[#1B1917]/30 outline-none transition-all duration-200 focus:border-[#00A876]/50 focus:ring-4 focus:ring-[#00A876]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[#1B1917]/35 hover:text-[#1B1917]/70 hover:bg-[#1B1917]/5 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2.5 rounded-2xl bg-[#0C1B16] text-white text-sm font-extrabold tracking-tight transition-all duration-200 hover:bg-[#123527] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-[0_6px_16px_rgba(12,27,22,0.25)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  Lanjutkan
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1B1917]/25" />
            <p className="text-[10px] font-semibold text-[#1B1917]/25 tracking-tight">Koneksi terenkripsi</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-8 md:px-12 pb-8 md:pb-12">
          <p className="text-[9px] font-bold text-[#1B1917]/30 tracking-[0.18em] uppercase">
            &copy; {new Date().getFullYear()} Dinas Kesehatan Kota Cirebon
          </p>
        </div>
      </div>
    </div>
  );
}
