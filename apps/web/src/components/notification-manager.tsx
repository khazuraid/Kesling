"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle2, Clock, Edit, ImageIcon, Megaphone, Plus, Send, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface PuskesmasItem {
  id: number;
  nama: string;
}

interface UserItem {
  id: number;
  nama: string;
  role: string;
  telegramChatId: string | null;
  puskesmas?: { nama: string } | null;
}

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  type: "INFO" | "WARNING" | "URGENT";
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  targetRole: "ALL" | "OPERATOR" | "DINKES" | "ADMIN";
  isPopup: boolean;
  createdAt: string;
  _count?: {
    dismissals: number;
  };
}

interface NotificationLogItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user: {
    id: number;
    nama: string;
    role: string;
    puskesmas?: { nama: string } | null;
  };
}

export function NotificationManager() {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<"broadcast" | "announcements">("broadcast");

  // Form State Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [targetType, setTargetType] = useState<"ALL" | "ROLE" | "PUSKESMAS" | "USER">("ALL");
  const [targetRole, setTargetRole] = useState("OPERATOR");
  const [puskesmasId, setPuskesmasId] = useState("");
  const [userId, setUserId] = useState("");
  const [sendTelegram, setSendTelegram] = useState(false);

  // Announcement Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annImageUrl, setAnnImageUrl] = useState<string | null>(null);
  const [annType, setAnnType] = useState<"INFO" | "WARNING" | "URGENT">("INFO");
  const [annTargetRole, setAnnTargetRole] = useState<"ALL" | "OPERATOR" | "DINKES" | "ADMIN">("ALL");
  const [annIsActive, setAnnIsActive] = useState(true);
  const [annIsPopup, setAnnIsPopup] = useState(true);
  const [annEndDate, setAnnEndDate] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch data pendukung
  const { data: puskesmasList = [] } = useQuery<PuskesmasItem[]>({
    queryKey: ["admin-pkm-list"],
    queryFn: async () => {
      const res = await fetch("/api/master/puskesmas");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: usersList = [] } = useQuery<UserItem[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return [];
      const json = await res.json();
      return json.users || [];
    },
  });

  // Query Riwayat Broadcast
  const { data: notificationLogs = [], isLoading: loadingLogs } = useQuery<NotificationLogItem[]>({
    queryKey: ["admin-notifications-history"],
    queryFn: async () => {
      const res = await fetch("/api/admin/notifications?take=30");
      if (!res.ok) return [];
      const json = await res.json();
      return json.notifications || [];
    },
    enabled: subTab === "broadcast",
  });

  // Query Announcements
  const { data: announcements = [], isLoading: loadingAnnouncements } = useQuery<AnnouncementItem[]>({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) return [];
      const json = await res.json();
      return json.announcements || [];
    },
    enabled: subTab === "announcements",
  });

  // Mutation Broadcast
  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          targetType,
          targetRole: targetType === "ROLE" ? targetRole : undefined,
          puskesmasId: targetType === "PUSKESMAS" ? Number(puskesmasId) : undefined,
          userId: targetType === "USER" ? Number(userId) : undefined,
          sendTelegram,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyiarkan notifikasi");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(
        `Berhasil menyiarkan notifikasi ke ${data.recipientCount} pengguna! ${
          data.telegramSent ? `(${data.telegramSent} via Telegram)` : ""
        }`,
      );
      setBroadcastTitle("");
      setBroadcastMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengirim notifikasi");
    },
  });

  // Mutation Save Announcement (Create / Update)
  const saveAnnouncementMutation = useMutation({
    mutationFn: async () => {
      const url = editingAnnouncement
        ? `/api/admin/announcements/${editingAnnouncement.id}`
        : "/api/admin/announcements";
      const method = editingAnnouncement ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          imageUrl: annImageUrl,
          type: annType,
          targetRole: annTargetRole,
          isActive: annIsActive,
          isPopup: annIsPopup,
          endDate: annEndDate ? new Date(annEndDate).toISOString() : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan pengumuman");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingAnnouncement ? "Pengumuman diperbarui" : "Pengumuman dibuat");
      setIsModalOpen(false);
      resetAnnouncementForm();
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-popup"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menyimpan pengumuman");
    },
  });

  // Mutation Delete Announcement
  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus pengumuman");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Pengumuman berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-popup"] });
    },
    onError: () => {
      toast.error("Gagal menghapus pengumuman");
    },
  });

  // Toggle Active Switcher
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement-popup"] });
    },
  });

  function resetAnnouncementForm() {
    setEditingAnnouncement(null);
    setAnnTitle("");
    setAnnContent("");
    setAnnImageUrl(null);
    setAnnType("INFO");
    setAnnTargetRole("ALL");
    setAnnIsActive(true);
    setAnnIsPopup(true);
    setAnnEndDate("");
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function openEditModal(ann: AnnouncementItem) {
    setEditingAnnouncement(ann);
    setAnnTitle(ann.title);
    setAnnContent(ann.content);
    setAnnImageUrl(ann.imageUrl || null);
    setAnnType(ann.type);
    setAnnTargetRole(ann.targetRole);
    setAnnIsActive(ann.isActive);
    setAnnIsPopup(ann.isPopup);
    setAnnEndDate(ann.endDate ? ann.endDate.split("T")[0] : "");
    if (imageInputRef.current) imageInputRef.current.value = "";
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* ── Sub Navigation Tabs ── */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setSubTab("broadcast")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            subTab === "broadcast"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="w-4 h-4" />
          Siaran Notifikasi (Broadcast)
        </button>
        <button
          onClick={() => setSubTab("announcements")}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            subTab === "announcements"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Kelola Pengumuman & Popup
        </button>
      </div>

      {/* ── TAB 1: BROADCAST ── */}
      {subTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Broadcast */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 sm:p-6 space-y-4 shadow-subtle">
              <div>
                <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Kirim Notifikasi Baru
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Siarkan notifikasi instan langsung ke lonceng aplikasi pengguna.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">Target Penerima</Label>
                  <Select
                    value={targetType}
                    onChange={(e: any) => setTargetType(e.target.value)}
                    className="h-10 text-xs font-medium"
                  >
                    <option value="ALL">Semua Pengguna</option>
                    <option value="ROLE">Berdasarkan Role</option>
                    <option value="PUSKESMAS">Puskesmas Tertentu</option>
                    <option value="USER">Pengguna Spesifik</option>
                  </Select>
                </div>

                {targetType === "ROLE" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">Pilih Role</Label>
                    <Select
                      value={targetRole}
                      onChange={(e: any) => setTargetRole(e.target.value)}
                      className="h-10 text-xs font-medium"
                    >
                      <option value="OPERATOR">Operator Puskesmas</option>
                      <option value="DINKES">Petugas Dinkes</option>
                      <option value="ADMIN">Administrator</option>
                    </Select>
                  </div>
                )}

                {targetType === "PUSKESMAS" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">Pilih Puskesmas</Label>
                    <Select
                      value={puskesmasId}
                      onChange={(e: any) => setPuskesmasId(e.target.value)}
                      className="h-10 text-xs font-medium"
                    >
                      <option value="">-- Pilih Puskesmas --</option>
                      {puskesmasList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nama}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {targetType === "USER" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">Pilih Pengguna</Label>
                    <Select
                      value={userId}
                      onChange={(e: any) => setUserId(e.target.value)}
                      className="h-10 text-xs font-medium"
                    >
                      <option value="">-- Pilih Pengguna --</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nama} ({u.role}) {u.puskesmas ? `- ${u.puskesmas.nama}` : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">Judul Notifikasi</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Pengingat Batas Laporan Bulanan"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="h-10 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">Isi Pesan</Label>
                  <Textarea
                    placeholder="Tuliskan pesan notifikasi yang jelas dan padat..."
                    rows={4}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Checkbox Telegram */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-subtle border border-border/60">
                  <input
                    type="checkbox"
                    id="telegram-opt"
                    checked={sendTelegram}
                    onChange={(e) => setSendTelegram(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                  <Label htmlFor="telegram-opt" className="text-xs font-medium cursor-pointer leading-tight">
                    Teruskan juga ke Telegram pengguna yang terhubung
                  </Label>
                </div>

                <Button
                  onClick={() => broadcastMutation.mutate()}
                  disabled={broadcastMutation.isPending || !broadcastTitle.trim() || !broadcastMessage.trim()}
                  className="w-full gap-2 font-bold shadow-xs text-xs h-10 mt-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {broadcastMutation.isPending ? "Mengirim Notifikasi..." : "Kirim Siaran Sekarang"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Tabel Riwayat Broadcast */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 sm:p-6 shadow-subtle">
              <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Riwayat Notifikasi Terakhir
                </h3>
                <span className="text-xs font-semibold text-muted-foreground">{notificationLogs.length} item</span>
              </div>

              {loadingLogs ? (
                <div className="py-12 text-center text-xs text-muted-foreground">Memuat riwayat...</div>
              ) : notificationLogs.length === 0 ? (
                <EmptyState
                  icon={<Bell className="w-6 h-6 text-muted-foreground" />}
                  title="Belum Ada Notifikasi"
                  description="Riwayat notifikasi yang dikirimkan ke pengguna akan tampil di sini."
                />
              ) : (
                <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
                  {notificationLogs.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 px-1 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                              item.isRead
                                ? "bg-surface-subtle text-muted-foreground border-border"
                                : "bg-primary-subtle text-primary border-primary/20"
                            }`}
                          >
                            {item.isRead ? "DIBACA" : "BELUM"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.message}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                          <span className="font-semibold text-foreground/80">{item.user?.nama}</span>
                          {item.user?.puskesmas && <span>• {item.user.puskesmas.nama}</span>}
                          <span>• {item.user?.role}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: ANNOUNCEMENTS & POPUP ── */}
      {subTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                Daftar Pengumuman Sistem
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pengumuman aktif berformat modal popup akan otomatis ditampilkan di layar utama pengguna.
              </p>
            </div>

            <Button
              onClick={() => {
                resetAnnouncementForm();
                setIsModalOpen(true);
              }}
              size="sm"
              className="gap-1.5 font-bold shadow-xs text-xs h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pengumuman
            </Button>
          </div>

          <Card className="p-0 overflow-hidden shadow-subtle border border-border">
            {loadingAnnouncements ? (
              <div className="py-12 text-center text-xs text-muted-foreground">Memuat daftar pengumuman...</div>
            ) : announcements.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={<Megaphone className="w-8 h-8 text-muted-foreground" />}
                  title="Belum Ada Pengumuman"
                  description="Buat pengumuman atau popup baru untuk menginformasikan berita penting kepada staf dan operator."
                  actionLabel="Buat Pengumuman Pertama"
                  onAction={() => {
                    resetAnnouncementForm();
                    setIsModalOpen(true);
                  }}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-subtle border-b border-border/80 text-muted-foreground font-bold">
                    <tr>
                      <th className="py-3 px-4">Judul & Isi</th>
                      <th className="py-3 px-3">Tipe</th>
                      <th className="py-3 px-3">Target Role</th>
                      <th className="py-3 px-3">Format</th>
                      <th className="py-3 px-3">Dikonfirmasi</th>
                      <th className="py-3 px-3 text-center">Status Aktif</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {announcements.map((ann) => (
                      <tr key={ann.id} className="hover:bg-surface-subtle/50 transition-colors">
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-3">
                            {ann.imageUrl ? (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-border bg-surface-subtle shrink-0 relative">
                                <Image
                                  src={ann.imageUrl}
                                  alt={ann.title}
                                  width={40}
                                  height={40}
                                  unoptimized
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-foreground truncate">{ann.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{ann.content}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                              ann.type === "URGENT"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : ann.type === "WARNING"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-primary-subtle text-primary border-primary/20"
                            }`}
                          >
                            {ann.type}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-semibold text-foreground/80">{ann.targetRole}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                              ann.isPopup ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {ann.isPopup ? "Modal Popup" : "Banner Biasa"}
                          </span>
                        </td>

                        <td className="py-3 px-3 tabular-nums font-semibold text-foreground/80">
                          {ann._count?.dismissals ?? 0} user
                        </td>

                        <td className="py-3 px-3 text-center">
                          <Switch
                            checked={ann.isActive}
                            onCheckedChange={(checked) =>
                              toggleActiveMutation.mutate({ id: ann.id, isActive: checked })
                            }
                          />
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(ann)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Hapus pengumuman "${ann.title}"?`)) {
                                  deleteAnnouncementMutation.mutate(ann.id);
                                }
                              }}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── MODAL TAMBAH/EDIT ANNOUNCEMENT ── */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAnnouncement ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
        size="md"
        variant="hero"
        icon={<Megaphone className="w-5 h-5" />}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveAnnouncementMutation.isPending || !annTitle.trim() || !annContent.trim()}
              onClick={() => saveAnnouncementMutation.mutate()}
              className="text-xs font-bold gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saveAnnouncementMutation.isPending ? "Menyimpan..." : "Simpan Pengumuman"}
            </Button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Judul Pengumuman</Label>
            <Input
              type="text"
              placeholder="Contoh: Pemeliharaan Server Malam Ini"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Tingkat / Tipe</Label>
              <Select
                value={annType}
                onChange={(e: any) => setAnnType(e.target.value)}
                className="h-10 text-xs font-medium"
              >
                <option value="INFO">INFO (Informasi Standar)</option>
                <option value="WARNING">WARNING (Peringatan)</option>
                <option value="URGENT">URGENT (Penting & Mendesak)</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/80">Target Role</Label>
              <Select
                value={annTargetRole}
                onChange={(e: any) => setAnnTargetRole(e.target.value)}
                className="h-10 text-xs font-medium"
              >
                <option value="ALL">Semua Pengguna</option>
                <option value="OPERATOR">Operator Puskesmas Saja</option>
                <option value="DINKES">Petugas Dinkes Saja</option>
                <option value="ADMIN">Administrator Saja</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Isi Pengumuman</Label>
            <Textarea
              placeholder="Tuliskan detail pengumuman yang akan ditampilkan kepada pengguna..."
              rows={5}
              value={annContent}
              onChange={(e) => setAnnContent(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          {/* Lampiran Gambar Pengumuman / Popup */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Gambar / Brosur (Opsional)</Label>
            {annImageUrl ? (
              <div className="relative rounded-xl border border-border p-2 bg-surface-subtle flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-surface shrink-0 relative">
                    <Image
                      src={annImageUrl}
                      alt="Preview"
                      width={56}
                      height={56}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground truncate">Gambar siap disimpan</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAnnImageUrl(null);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                  }}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error("Ukuran gambar maksimal 5MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      setAnnImageUrl(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-11 border-dashed gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Unggah Gambar Pengumuman (PNG, JPG, WebP max 5MB)
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground/80">Berlaku Sampai (Opsional)</Label>
            <Input
              type="date"
              value={annEndDate}
              onChange={(e) => setAnnEndDate(e.target.value)}
              className="h-10 text-xs"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border/60">
            <div>
              <p className="text-xs font-bold text-foreground">Tampilkan Sebagai Modal Popup</p>
              <p className="text-[11px] text-muted-foreground">
                Jika aktif, dialog otomatis muncul di tengah layar saat pengguna membuka aplikasi.
              </p>
            </div>
            <Switch checked={annIsPopup} onCheckedChange={setAnnIsPopup} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border/60">
            <div>
              <p className="text-xs font-bold text-foreground">Status Aktif</p>
              <p className="text-[11px] text-muted-foreground">
                Aktifkan agar pengumuman langsung dapat dilihat pengguna.
              </p>
            </div>
            <Switch checked={annIsActive} onCheckedChange={setAnnIsActive} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
