"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Check, Lock, QrCode, RefreshCw, ShieldCheck, Smartphone, User } from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState<string>("overview");
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
    if (newPassword.length < 8) {
      toast.error("Password minimal 8 karakter");
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error("Password harus memuat huruf dan angka");
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
      await update({});
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const d = await res.json();
      toast.error(d.error);
    }
  }

  const displayName = profileData?.nama || user?.name || "Profil";
  const displayEmail = profileData?.email || user?.email || "";
  const displayRole = profileData?.role || user?.role || "-";
  const displayPuskesmas = profileData?.puskesmas?.nama || user?.puskesmasNama;

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-5">
            <Avatar className="w-14 h-14 rounded-2xl shadow-xs">
              <AvatarFallback className="bg-primary text-primary-foreground font-black text-[22px] rounded-2xl">
                {displayName.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1">
                {displayRole} {displayPuskesmas ? `· ${displayPuskesmas}` : ""}
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                {displayName}
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-1.5">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT - Avatar + Details */}
          <div className="space-y-4">
            {/* Avatar Card */}
            <Card className="p-6 text-center space-y-3">
              <Avatar className="w-20 h-20 mx-auto shadow-subtle">
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-2xl">
                  {displayName.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-[15px] font-bold tracking-tight text-foreground">{displayName}</h2>
                <Badge variant="outline" className="mt-2 text-[10px] uppercase font-bold tracking-wider">
                  {displayRole}
                </Badge>
              </div>
            </Card>

            {/* Details Card */}
            <Card className="p-6 space-y-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                Detail Informasi
              </span>
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Nama</span>
                  <span className="text-[12px] font-bold text-foreground">{displayName}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Email</span>
                  <span className="text-[12px] font-bold text-foreground">{displayEmail}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Role</span>
                  <span className="text-[12px] font-bold text-foreground">{displayRole}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                    Puskesmas
                  </span>
                  <span className="text-[12px] font-bold text-foreground">{displayPuskesmas || "Semua (Admin)"}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Status</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" className="text-[11px] py-0 px-2">
                      Aktif
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT - Tabs Content */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <div className="border-b border-border bg-surface-subtle px-4 pt-3">
                  <TabsList className="bg-transparent gap-2 p-0 h-auto">
                    <TabsTrigger
                      value="overview"
                      className="gap-2 px-4 py-2.5 data-[state=active]:bg-surface data-[state=active]:shadow-xs rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <User className="w-4 h-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="gap-2 px-4 py-2.5 data-[state=active]:bg-surface data-[state=active]:shadow-xs rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <Lock className="w-4 h-4" /> Security
                    </TabsTrigger>
                    <TabsTrigger
                      value="mobile"
                      className="gap-2 px-4 py-2.5 data-[state=active]:bg-surface data-[state=active]:shadow-xs rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <Smartphone className="w-4 h-4" /> Akses Mobile
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    {/* Edit Profile Form */}
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <h3 className="text-[14px] font-bold text-foreground tracking-tight">Informasi Profil</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                            Nama Lengkap
                          </label>
                          <Input
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            required
                            className="h-10 text-[12px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                            Email
                          </label>
                          <Input
                            value={user?.email || ""}
                            disabled
                            className="h-10 text-[12px] opacity-60 cursor-not-allowed bg-surface-subtle"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={loading} size="sm" className="gap-2 shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                      </div>
                    </form>

                    <div className="border-t border-border" />

                    {/* Activity */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-[14px] font-bold text-foreground tracking-tight">Aktivitas Terakhir</h3>
                      </div>
                      {activityLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-3 p-3 bg-surface-subtle border border-border rounded-xl animate-pulse"
                            >
                              <div className="w-8 h-8 bg-border rounded-lg shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-40 bg-border rounded-sm" />
                                <div className="h-2 w-24 bg-border rounded-sm" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : activity.length === 0 ? (
                        <Card className="p-6 text-center border-dashed bg-surface-subtle/30">
                          <Activity className="w-6 h-6 text-muted-foreground opacity-50 mx-auto mb-2" />
                          <p className="text-[12px] font-bold text-foreground">Belum ada aktivitas tercatat</p>
                        </Card>
                      ) : (
                        <div className="space-y-2">
                          {activity.slice(0, 5).map((a: any) => (
                            <div
                              key={a.id}
                              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface hover:bg-surface-subtle/50 transition-colors shadow-xs"
                            >
                              <Badge
                                variant={
                                  a.action === "CREATE" ? "success" : a.action === "UPDATE" ? "warning" : "destructive"
                                }
                                className="text-[10px] font-bold shrink-0 px-2 py-0.5"
                              >
                                {a.action === "CREATE" ? "NEW" : a.action === "UPDATE" ? "UPD" : "DEL"}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-foreground">
                                  {a.action} <span className="text-muted-foreground font-normal">— {a.tableName}</span>
                                </p>
                                <p className="text-[10px] font-medium text-muted-foreground mt-0.5 tabular-nums">
                                  {new Date(a.createdAt).toLocaleString("id-ID")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="mt-0 space-y-5">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <h3 className="text-[14px] font-bold text-foreground tracking-tight">Ubah Password</h3>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                          Password Saat Ini
                        </label>
                        <Input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="h-10 text-[12px] max-w-md"
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                            Password Baru
                          </label>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Min. 8 karakter"
                            className="h-10 text-[12px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
                            Konfirmasi Password Baru
                          </label>
                          <Input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Ulangi password baru"
                            className="h-10 text-[12px]"
                          />
                        </div>
                      </div>

                      {/* Security requirements */}
                      <Card className="p-4 bg-surface-subtle/50 space-y-2.5">
                        <p className="text-[10px] font-bold text-foreground uppercase tracking-[0.1em]">
                          Syarat Keamanan
                        </p>
                        <ul className="space-y-2">
                          <li className="flex items-center gap-2.5 text-[12px] font-medium text-muted-foreground">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                newPassword.length >= 8 && /[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword)
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            Minimal 8 karakter, huruf + angka
                          </li>
                          <li className="flex items-center gap-2.5 text-[12px] font-medium text-muted-foreground">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                newPassword === confirmPassword && newPassword.length > 0
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                            Konfirmasi password cocok
                          </li>
                        </ul>
                      </Card>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                        >
                          Reset
                        </Button>
                        <Button type="submit" disabled={loading} size="sm" className="gap-2 shadow-xs">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {loading ? "Menyimpan..." : "Update Password"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="mobile" className="mt-0 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <QrCode className="w-4 h-4 text-muted-foreground" />
                          <h3 className="text-[14px] font-bold text-foreground tracking-tight">
                            Hubungkan iPhone / iPad
                          </h3>
                        </div>
                        <p className="text-[12px] leading-5 text-muted-foreground max-w-xl">
                          Buka aplikasi Kesling Mobile di iPhone, pilih <b>Scan QR Code dari Web Profil</b>, lalu
                          arahkan kamera ke kode ini.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => refreshMobileLink()}
                        className="gap-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                      </Button>
                    </div>

                    <div className="grid md:grid-cols-[240px_1fr] gap-5 items-start">
                      <Card className="bg-white p-4 flex items-center justify-center min-h-[240px]">
                        {mobileLinkLoading ? (
                          <span className="text-[12px] font-bold text-muted-foreground">Membuat QR...</span>
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
                          <span className="text-[12px] font-bold text-destructive">QR belum tersedia</span>
                        )}
                      </Card>

                      <Card className="p-5 space-y-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                            Alur Web ke iPhone
                          </span>
                          <p className="text-[13px] font-bold text-foreground">
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
                            <li key={item} className="flex gap-3 text-[12px] text-muted-foreground">
                              <span className="w-5 h-5 shrink-0 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                {index + 1}
                              </span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>

                        <div className="border-t border-border pt-4 text-[11px] leading-5 text-muted-foreground">
                          Token berlaku {mobileLink?.expiresInDays ?? 30} hari dan disimpan terenkripsi di SecureStore
                          perangkat. Jika iPhone hilang, hapus akun dari perangkat atau ganti password.
                        </div>
                      </Card>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
