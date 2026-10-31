"use client";

import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
        <Card className="p-6 sm:p-8 space-y-6 shadow-subtle">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black tracking-tight text-foreground">Masuk</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Masukkan kredensial Anda untuk mengakses portal pelaporan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription className="text-xs font-semibold leading-snug">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@puskesmas.go.id"
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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

            <Button type="submit" disabled={loading} className="w-full h-11 gap-2 text-sm font-semibold shadow-xs">
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
            </Button>
          </form>
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
