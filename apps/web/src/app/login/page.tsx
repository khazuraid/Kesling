"use client";

import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";

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
      callbackUrl: safeCallback,
    });
    setLoading(false);
    if (res?.error) {
      setError("Kredensial tidak valid. Silakan periksa kembali email atau sandi Anda.");
    } else {
      window.location.href = safeCallback;
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
        <div className="bg-surface border border-border rounded-card shadow-subtle p-6 sm:p-8 space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Masuk</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Masukkan kredensial Anda untuk mengakses portal pelaporan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-button bg-error-light border border-error/20 text-error text-xs font-semibold leading-snug">
                <div className="w-1.5 h-1.5 rounded-full bg-error shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                className="w-full h-11 px-3.5 rounded-button bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors hover:border-border-hover focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="w-full h-11 px-3.5 pr-11 rounded-button bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors hover:border-border-hover focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-subtle transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-button bg-primary hover:bg-primary-hover active:scale-[0.98] text-white text-sm font-semibold tracking-tight transition-transform duration-150 disabled:opacity-50 disabled:pointer-events-none shadow-xs cursor-pointer"
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

          <div className="pt-1 flex items-center justify-center gap-1.5 text-muted-foreground/80">
            <ShieldCheck className="w-3.5 h-3.5" />
            <p className="text-[11px] font-medium tracking-tight">Koneksi aman terenkripsi</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Dinas Kesehatan Kota Cirebon
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
