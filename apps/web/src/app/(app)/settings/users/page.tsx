"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Edit2,
  KeyRound,
  Lock,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5";

const ROLE_META: Record<string, { variant: "destructive" | "secondary" | "default"; label: string }> = {
  ADMIN: { variant: "destructive", label: "Admin" },
  DINKES: { variant: "secondary", label: "Dinkes" },
  OPERATOR: { variant: "default", label: "Operator" },
};

const STATUS_META: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }
> = {
  ACTIVE: { variant: "default", label: "Aktif", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  PENDING_APPROVAL: {
    variant: "secondary",
    label: "Menunggu Persetujuan",
    className: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
  },
  PENDING_EMAIL: { variant: "outline", label: "Verifikasi Email", className: "text-muted-foreground border-dashed" },
  REJECTED: {
    variant: "destructive",
    label: "Ditolak",
    className: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200",
  },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"ALL" | "PENDING_APPROVAL" | "ACTIVE" | "REJECTED">("ALL");
  const [showForm, setShowForm] = useState(false);
  const [rejectModalUser, setRejectModalUser] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resetPasswordModalUser, setResetPasswordModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const [form, setForm] = useState({
    nama: "",
    username: "",
    email: "",
    password: "",
    role: "OPERATOR",
    puskesmasId: "",
    telegramChatId: "",
  });
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: puskesmasList = [] } = useQuery<any[]>({
    queryKey: ["master", "puskesmas"],
    queryFn: () => fetch("/api/master/puskesmas").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        username: form.username ? form.username.trim().toLowerCase() : null,
        puskesmasId: form.puskesmasId ? Number(form.puskesmasId) : null,
      };
      const url = editId ? `/api/users/${editId}` : "/api/users";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal menyimpan operator");
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Operator updated" : "Operator created");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to save operator"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Operator deleted");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to delete operator"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: number; status: "ACTIVE" | "REJECTED"; reason?: string }) => {
      const res = await fetch(`/api/users/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Gagal memperbarui status akun");
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "ACTIVE" ? "Akun disetujui & diaktifkan" : "Pendaftaran akun ditolak");
      setRejectModalUser(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal memperbarui status akun"),
  });

  const userActionMutation = useMutation({
    mutationFn: async ({ id, action, payload = {} }: { id: number; action: string; payload?: any }) => {
      const res = await fetch(`/api/users/${id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengeksekusi aksi akun");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Aksi berhasil diproses");
      setResetPasswordModalUser(null);
      setNewPasswordInput("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err.message || "Gagal memproses aksi akun"),
  });

  function openEdit(user: any) {
    setEditId(user.id);
    setForm({
      nama: user.nama,
      username: user.username || "",
      email: user.email,
      password: "",
      role: user.role,
      puskesmasId: user.puskesmasId || "",
      telegramChatId: user.telegramChatId || "",
    });
    setShowForm(true);
  }

  function openAdd() {
    setEditId(null);
    setForm({
      nama: "",
      username: "",
      email: "",
      password: "",
      role: "OPERATOR",
      puskesmasId: "",
      telegramChatId: "",
    });
    setShowForm(true);
  }

  const pendingCount = users.filter((u: any) => (u.status || "ACTIVE") === "PENDING_APPROVAL").length;

  const filtered = users
    .filter((u: any) => {
      const currentStatus = u.status || "ACTIVE";
      if (tab === "PENDING_APPROVAL") return currentStatus === "PENDING_APPROVAL";
      if (tab === "ACTIVE") return currentStatus === "ACTIVE";
      if (tab === "REJECTED") return currentStatus === "REJECTED";
      return true;
    })
    .filter(
      (u: any) =>
        u.nama.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-4">
      {/* Header Tabs & Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setTab("ALL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "ALL" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("PENDING_APPROVAL")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                tab === "PENDING_APPROVAL"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Menunggu Persetujuan
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white text-amber-700">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTab("ACTIVE")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "ACTIVE"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aktif
            </button>
            <button
              type="button"
              onClick={() => setTab("REJECTED")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "REJECTED"
                  ? "bg-surface text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ditolak
            </button>
          </div>

          <Button onClick={openAdd} className="rounded-full gap-2 shadow-xs">
            <Plus className="w-3.5 h-3.5" /> Tambah Operator
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, username, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Tidak ada yang cocok" : "Belum ada pengguna pada kategori ini"}
          description="Klik Tambah Operator untuk membuat akun baru secara manual."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Nama & Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Puskesmas</TableHead>
                  <TableHead className="text-right w-36">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u: any) => {
                  const roleMeta = ROLE_META[u.role] || ROLE_META.OPERATOR;
                  const currentStatus = u.status || "ACTIVE";
                  const statusMeta = STATUS_META[currentStatus] || STATUS_META.ACTIVE;

                  return (
                    <TableRow key={u.id} className="hover:bg-surface-subtle transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-primary-subtle text-primary border border-primary/20">
                            <AvatarFallback className="font-bold text-xs bg-primary-subtle text-primary">
                              {u.nama.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <div className="text-[12px] font-bold text-foreground">{u.nama}</div>
                            {u.username && (
                              <div className="text-[11px] font-mono text-muted-foreground">@{u.username}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] font-medium text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleMeta.variant} className="text-[10px] uppercase">
                          {roleMeta.label || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMeta.variant} className={`text-[10px] ${statusMeta.className || ""}`}>
                          {statusMeta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] font-medium text-muted-foreground">
                        {u.puskesmas ? u.puskesmas.nama : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-1">
                          {/* Approval Actions for Pending Registrations */}
                          {currentStatus === "PENDING_APPROVAL" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => statusMutation.mutate({ id: u.id, status: "ACTIVE" })}
                                disabled={statusMutation.isPending}
                                className="h-7 px-2 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 gap-1"
                                title="Setujui Akun"
                              >
                                <Check className="w-3.5 h-3.5" /> Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectModalUser(u)}
                                disabled={statusMutation.isPending}
                                className="h-7 px-2 text-xs font-bold text-rose-700 bg-rose-50 border-rose-300 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300 gap-1"
                                title="Tolak Akun"
                              >
                                <X className="w-3.5 h-3.5" /> Tolak
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary-subtle hover:text-primary"
                            title="Ubah operator"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>

                          {/* Dropdown Menu Aksi Pengguna */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:bg-surface-subtle"
                                title="Menu Aksi Pengguna"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Aksi Akun</DropdownMenuLabel>

                              <DropdownMenuItem
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Reset sesi OTP 2FA untuk "${u.nama}"? Pengguna akan wajib verifikasi OTP saat login berikutnya.`,
                                    )
                                  ) {
                                    userActionMutation.mutate({ id: u.id, action: "RESET_OTP" });
                                  }
                                }}
                                className="gap-2 text-[12px] cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-primary" />
                                <span>Reset OTP 2FA</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  setResetPasswordModalUser(u);
                                  setNewPasswordInput("");
                                }}
                                className="gap-2 text-[12px] cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Ganti Password</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  userActionMutation.mutate({ id: u.id, action: "UNLOCK_ACCOUNT" });
                                }}
                                className="gap-2 text-[12px] cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Buka Kunci Login</span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Hapus permanen pengguna "${u.nama}"?`)) deleteMutation.mutate(u.id);
                                }}
                                className="gap-2 text-[12px] text-destructive focus:text-destructive cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Akun</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Reset Password Modal */}
      <Modal
        open={!!resetPasswordModalUser}
        onClose={() => setResetPasswordModalUser(null)}
        title="Ganti Password Pengguna"
        description={`Setel kata sandi baru secara langsung untuk ${resetPasswordModalUser?.nama || ""}`}
        icon={<Lock className="w-4 h-4 text-amber-600" />}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResetPasswordModalUser(null)}
              className="rounded-full"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (newPasswordInput.trim().length < 8) {
                  toast.error("Password minimal 8 karakter");
                  return;
                }
                userActionMutation.mutate({
                  id: resetPasswordModalUser.id,
                  action: "RESET_PASSWORD",
                  payload: { newPassword: newPasswordInput.trim() },
                });
              }}
              disabled={userActionMutation.isPending || newPasswordInput.trim().length < 8}
              className="rounded-full gap-2 shadow-xs"
            >
              {userActionMutation.isPending ? "Menyimpan..." : "Simpan Password"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>Password Baru</Label>
            <Input
              type="password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Minimal 8 karakter..."
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Setelah password diganti, sesi OTP pengguna akan otomatis di-reset untuk keamanan.
            </p>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={!!rejectModalUser}
        onClose={() => setRejectModalUser(null)}
        title="Tolak Pendaftaran Pengguna"
        description={`Masukkan alasan penolakan akun untuk ${rejectModalUser?.nama || ""}`}
        icon={<X className="w-4 h-4 text-destructive" />}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejectModalUser(null)}
              className="rounded-full"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() =>
                statusMutation.mutate({
                  id: rejectModalUser.id,
                  status: "REJECTED",
                  reason: rejectionReason,
                })
              }
              disabled={statusMutation.isPending}
              className="rounded-full gap-2 shadow-xs"
            >
              {statusMutation.isPending ? "Memproses..." : "Konfirmasi Tolak"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className={labelCls}>Alasan Penolakan</Label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Bukan staf resmi Puskesmas atau NIP tidak sesuai"
              required
            />
          </div>
        </div>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Ubah Operator" : "Tambah Operator"}
        description={editId ? "Perbarui informasi akun pengguna" : "Buat akun pengguna baru dalam sistem"}
        icon={<Users className="w-4 h-4" />}
        size="sm"
        variant="hero"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              className="rounded-full"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full gap-2 shadow-xs"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className={labelCls}>Nama</Label>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Username <span className="font-medium normal-case">(opsional untuk login)</span>
            </Label>
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Contoh: fikri atau petugas_kesling"
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Password {editId && <span className="font-medium normal-case">(kosongkan jika tetap)</span>}
            </Label>
            <Input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              required={!editId}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={labelCls}>Role</Label>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="text-[12px] font-medium"
              >
                <option value="ADMIN">Admin</option>
                <option value="OPERATOR">Operator</option>
                <option value="DINKES">Dinkes</option>
              </Select>
            </div>
            {form.role === "OPERATOR" && (
              <div className="space-y-1.5">
                <Label className={labelCls}>Puskesmas</Label>
                <Select
                  value={form.puskesmasId}
                  onChange={(e) => setForm({ ...form, puskesmasId: e.target.value })}
                  className="text-[12px] font-medium"
                >
                  <option value="">— Pilih —</option>
                  {puskesmasList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Telegram Chat ID <span className="font-medium normal-case">(opsional)</span>
            </Label>
            <Input
              value={form.telegramChatId}
              onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
              placeholder="Contoh: 123456789"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
