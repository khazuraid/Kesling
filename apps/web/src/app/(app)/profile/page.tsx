"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Check, Lock, QrCode, RefreshCw, ShieldCheck, Smartphone, User } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState<"overview" | "security" | "mobile">("overview");
  const [nama, setNama] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: profileData, refetch: refetchProfile } = useQuery<{
    id: number;
    nama: string;
    email: string;
    role: string;
    puskesmas?: { nama: string };
  }>({
    queryKey: ["profile-me"],
    queryFn: async () => {
      const res = await fetch("/api/profile");
      if (!res.ok) throw new Error("Gagal mengambil profil");
      return res.json();
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (profileData?.nama) {
      setNama(profileData.nama);
    } else if (user?.name) {
      setNama(user.name);
    }
  }, [profileData?.nama, user?.name]);

  const { data: activity = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: ["audit-log-me"],
    queryFn: async () => {
      const res = await fetch("/api/audit-log?limit=10");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 5000,
  });

  const {
    data: mobileLink,
    isLoading: mobileLinkLoading,
    refetch: refreshMobileLink,
  } = useQuery<{ qrDataUrl: string; expiresInDays: number }>({
    queryKey: ["mobile-link-qr"],
    queryFn: async () => {
      const res = await fetch("/api/mobile/v1/auth/link", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal membuat QR mobile");
      return json;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    const cleanNama = nama.trim();
    if (!cleanNama) {
      toast.error("Nama lengkap tidak boleh kosong");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: cleanNama }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Gagal memperbarui profil");

      toast.success("Profil berhasil diupdate");
      await update({ name: cleanNama });
      await refetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Password berhasil diubah");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const d = await res.json();
      toast.error(d.error);
    }
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <User className="w-4 h-4" /> },
    { id: "security" as const, label: "Security", icon: <Lock className="w-4 h-4" /> },
    { id: "mobile" as const, label: "Akses Mobile", icon: <Smartphone className="w-4 h-4" /> },
  ];

  const displayName = profileData?.nama || user?.name || "Profil";
  const displayEmail = profileData?.email || user?.email || "";
  const displayRole = profileData?.role || user?.role || "-";
  const displayPuskesmas = profileData?.puskesmas?.nama || user?.puskesmasNama;

  return (
    <div className="w-full mx-auto pb-4 space-y-6 fade-in">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0C1B16] text-white px-8 py-7">
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#00A876] opacity-[0.14]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,#123527_0%,transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00A876] flex items-center justify-center text-[22px] font-black text-[#06281E] shrink-0">
            {displayName.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-1">
              {displayRole} {displayPuskesmas ? `· ${displayPuskesmas}` : ""}
            </p>
            <h1 className="text-[26px] font-black tracking-[-0.03em] leading-none">{displayName}</h1>
            <p className="text-[12px] font-medium text-white/50 mt-1.5">{displayEmail}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* LEFT - Avatar + Details */}
        <div className="space-y-4">
          {/* Avatar */}
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 text-center">
            <div className="w-20 h-20 bg-[hsl(var(--foreground))] flex items-center justify-center text-2xl font-bold text-[hsl(var(--background))] mx-auto mb-3">
              {displayName.charAt(0) || "U"}
            </div>
            <h2 className="text-[15px] font-bold tracking-tight text-[hsl(var(--foreground))]">{displayName}</h2>
            <span className="inline-block mt-2 text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] border border-[hsl(var(--border))] px-2 py-0.5">
              {displayRole}
            </span>
          </div>

          {/* Details */}
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
            <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
              Detail Informasi
            </span>
            <div className="space-y-3 mt-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Nama
                </span>
                <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{displayName}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Email
                </span>
                <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{displayEmail}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Role
                </span>
                <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{displayRole}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Puskesmas
                </span>
                <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">
                  {displayPuskesmas || "Semua (Admin)"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                  Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[hsl(var(--success))]">
                  <span className="w-1.5 h-1.5 bg-[hsl(var(--success))]" /> Aktif
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT - Tabs Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            <div className="flex border-b border-[hsl(var(--border))]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-[12px] font-bold transition-colors ${
                    tab === t.id
                      ? "border-b-2 border-[hsl(var(--foreground))] text-[hsl(var(--foreground))] -mb-px"
                      : "border-b-2 border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Edit Profile Form */}
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] tracking-tight">
                      Informasi Profil
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                          Nama Lengkap
                        </label>
                        <input
                          value={nama}
                          onChange={(e) => setNama(e.target.value)}
                          required
                          className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))]/30 transition-colors"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                          Email
                        </label>
                        <input
                          value={user?.email || ""}
                          disabled
                          className="w-full h-9 px-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--muted-foreground))] outline-none opacity-50 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="h-9 px-4 flex items-center gap-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[12px] font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {loading ? "Menyimpan..." : "Simpan Perubahan"}
                      </button>
                    </div>
                  </form>

                  {/* Divider */}
                  <div className="border-t border-[hsl(var(--border))]" />

                  {/* Activity */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                      <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] tracking-tight">
                        Aktivitas Terakhir
                      </h3>
                    </div>
                    {activityLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] animate-pulse"
                          >
                            <div className="w-8 h-8 bg-[hsl(var(--border))] shrink-0" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-40 bg-[hsl(var(--border))]" />
                              <div className="h-2 w-24 bg-[hsl(var(--border))]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : activity.length === 0 ? (
                      <div className="p-6 text-center border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
                        <div className="w-10 h-10 bg-[hsl(var(--muted))] flex items-center justify-center mx-auto mb-3">
                          <Activity className="w-5 h-5 text-[hsl(var(--muted-foreground))] opacity-50" />
                        </div>
                        <p className="text-[12px] font-bold text-[hsl(var(--foreground))]">
                          Belum ada aktivitas tercatat
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activity.slice(0, 5).map((a: any) => (
                          <div
                            key={a.id}
                            className="flex items-start gap-3 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]/20 transition-colors"
                          >
                            <div
                              className={`w-8 h-8 flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                                a.action === "CREATE"
                                  ? "bg-[hsl(var(--success))]"
                                  : a.action === "UPDATE"
                                    ? "bg-[hsl(var(--info))]"
                                    : "bg-[hsl(var(--error))]"
                              }`}
                            >
                              {a.action === "CREATE" ? "NEW" : a.action === "UPDATE" ? "UPD" : "DEL"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] font-bold text-[hsl(var(--foreground))]">
                                {a.action} <span className="text-[hsl(var(--muted-foreground))]">— {a.tableName}</span>
                              </p>
                              <p className="text-[10px] font-medium text-[hsl(var(--muted-foreground))] mt-0.5 tabular-nums">
                                {new Date(a.createdAt).toLocaleString("id-ID")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "security" && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] tracking-tight">Ubah Password</h3>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                      Password Saat Ini
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))]/30 transition-colors max-w-md"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-[hsl(var(--border))]">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                        Password Baru
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Min. 6 karakter"
                        className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))]/30 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.1em]">
                        Konfirmasi Password Baru
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Ulangi password baru"
                        className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--foreground))]/30 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Security requirements */}
                  <div className="border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-4">
                    <p className="text-[10px] font-bold text-[hsl(var(--foreground))] uppercase tracking-[0.1em] mb-3">
                      Syarat Keamanan
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
                        <div
                          className={`w-4 h-4 flex items-center justify-center text-[8px] ${newPassword.length >= 6 ? "bg-[hsl(var(--success))] text-white" : "bg-[hsl(var(--muted))] text-transparent"}`}
                        >
                          ✓
                        </div>
                        Minimal 6 karakter
                      </li>
                      <li className="flex items-center gap-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
                        <div
                          className={`w-4 h-4 flex items-center justify-center text-[8px] ${newPassword === confirmPassword && newPassword.length > 0 ? "bg-[hsl(var(--success))] text-white" : "bg-[hsl(var(--muted))] text-transparent"}`}
                        >
                          ✓
                        </div>
                        Konfirmasi password cocok
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="h-9 px-4 border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-9 px-4 flex items-center gap-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[12px] font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> {loading ? "Menyimpan..." : "Update Password"}
                    </button>
                  </div>
                </form>
              )}

              {tab === "mobile" && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <QrCode className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        <h3 className="text-[14px] font-bold text-[hsl(var(--foreground))] tracking-tight">
                          Hubungkan iPhone / iPad
                        </h3>
                      </div>
                      <p className="text-[12px] leading-5 text-[hsl(var(--muted-foreground))] max-w-xl">
                        Buka aplikasi Kesling Mobile di iPhone, pilih <b>Scan QR Code dari Web Profil</b>, lalu arahkan
                        kamera ke kode ini.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => refreshMobileLink()}
                      className="h-9 px-3 inline-flex items-center gap-2 border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                  </div>

                  <div className="grid md:grid-cols-[240px_1fr] gap-5 items-start">
                    <div className="border border-[hsl(var(--border))] bg-white p-4 flex items-center justify-center min-h-[240px]">
                      {mobileLinkLoading ? (
                        <span className="text-[12px] font-bold text-[hsl(var(--muted-foreground))]">Membuat QR...</span>
                      ) : mobileLink?.qrDataUrl ? (
                        <Image
                          src={mobileLink.qrDataUrl}
                          alt="QR Code akses mobile"
                          width={208}
                          height={208}
                          unoptimized
                          className="w-full h-auto"
                        />
                      ) : (
                        <span className="text-[12px] font-bold text-[hsl(var(--destructive))]">QR belum tersedia</span>
                      )}
                    </div>

                    <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                          Alur Web ke iPhone
                        </span>
                        <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">
                          Web membuat sesi mobile aman untuk akun yang sedang login.
                        </p>
                      </div>

                      <ol className="space-y-3">
                        {[
                          "Buka Kesling Mobile di iPhone",
                          "Pilih tombol Scan QR dari Web Profil",
                          "Scan QR ini sampai aplikasi otomatis masuk",
                          "Akun tersimpan untuk perangkat bersama Puskesmas",
                        ].map((item, index) => (
                          <li key={item} className="flex gap-3 text-[12px] text-[hsl(var(--muted-foreground))]">
                            <span className="w-5 h-5 shrink-0 flex items-center justify-center bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="border-t border-[hsl(var(--border))] pt-4 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">
                        Token berlaku {mobileLink?.expiresInDays ?? 30} hari dan disimpan terenkripsi di SecureStore
                        perangkat. Jika iPhone hilang, hapus akun dari perangkat atau ganti password.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
