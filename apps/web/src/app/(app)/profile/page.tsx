"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const user = session?.user as any;
  const [tab, setTab] = useState<"overview" | "security">("overview");
  const [nama, setNama] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: activity = [] } = useQuery<any[]>({
    queryKey: ["audit-log-me"],
    queryFn: async () => {
      const res = await fetch("/api/audit-log?limit=10");
      const json = await res.json();
      return json.data || [];
    },
  });

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Profil berhasil diupdate"); await update(); }
    else { const d = await res.json(); toast.error(d.error); }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("Konfirmasi password tidak cocok"); return; }
    if (newPassword.length < 6) { toast.error("Password minimal 6 karakter"); return; }
    setLoading(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setLoading(false);
    if (res.ok) { toast.success("Password berhasil diubah"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    else { const d = await res.json(); toast.error(d.error); }
  }

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: "👤" },
    { id: "security" as const, label: "Security", icon: "🔒" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Kelola informasi dan keamanan akun</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left - Profile Card */}
        <div className="space-y-6">
          {/* Avatar Card */}
          <div className="card p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-4xl font-bold text-[hsl(var(--primary))] mx-auto mb-4">
              {user?.name?.charAt(0) || "U"}
            </div>
            <h2 className="text-lg font-bold">{user?.name}</h2>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${user?.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
              {user?.role}
            </span>
          </div>

          {/* Details Card */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Detail</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Nama</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Role</span>
                <span className="font-medium">{user?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Puskesmas</span>
                <span className="font-medium">{user?.puskesmasNama || "Semua (Admin)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[hsl(var(--muted-foreground))]">Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Tabs Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="card">
            <div className="flex border-b border-[hsl(var(--border))]">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? "border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                      : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                  }`}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === "overview" && (
                <div className="space-y-6">
                  {/* Edit Profile Form */}
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <h3 className="font-semibold">Informasi Profil</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Nama Lengkap</label>
                        <input
                          value={nama}
                          onChange={(e) => setNama(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Email</label>
                        <input
                          value={user?.email || ""}
                          disabled
                          className="w-full px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={loading} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white">
                        Simpan
                      </Button>
                    </div>
                  </form>

                  {/* Activity */}
                  <div>
                    <h3 className="font-semibold mb-4">Aktivitas Terakhir</h3>
                    {activity.length === 0 ? (
                      <p className="text-sm text-[hsl(var(--muted-foreground))]">Belum ada aktivitas</p>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 5).map((a: any) => (
                          <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))]/50">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              a.action === "CREATE" ? "bg-emerald-500" : a.action === "UPDATE" ? "bg-blue-500" : "bg-red-500"
                            }`}>
                              {a.action === "CREATE" ? "+" : a.action === "UPDATE" ? "✎" : "×"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {a.action} — <span className="text-[hsl(var(--muted-foreground))]">{a.tableName}</span>
                              </p>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
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
                  <h3 className="font-semibold">Ubah Password</h3>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Password Saat Ini</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Password Baru</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Min. 6 karakter"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Konfirmasi Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Ulangi password baru"
                        className="w-full px-4 py-2.5 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
                      />
                    </div>
                  </div>

                  {/* Password requirements */}
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                    <p className="text-sm font-medium text-amber-800 mb-2">Persyaratan Password:</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className={newPassword.length >= 6 ? "text-emerald-600" : ""}>
                          {newPassword.length >= 6 ? "✓" : "○"}
                        </span>
                        Minimal 6 karakter
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={newPassword === confirmPassword && newPassword.length > 0 ? "text-emerald-600" : ""}>
                          {newPassword === confirmPassword && newPassword.length > 0 ? "✓" : "○"}
                        </span>
                        Konfirmasi password cocok
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => { setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}>
                      Reset
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white">
                      {loading ? "Menyimpan..." : "Ubah Password"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
