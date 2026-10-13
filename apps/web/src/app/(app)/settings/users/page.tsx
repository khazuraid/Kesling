"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";

const inputCls =
  "w-full h-10 px-3.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] focus:shadow-[0_0_0_3px_rgba(0,168,118,0.12)] transition-all";
const labelCls =
  "block text-[9px] font-extrabold uppercase tracking-[0.15em] text-[hsl(var(--muted-foreground))] mb-1.5";

const ROLE_META: Record<string, { chip: string }> = {
  ADMIN: { chip: "bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25" },
  DINKES: { chip: "bg-[#5B8DEF]/10 text-[#5B8DEF] border border-[#5B8DEF]/25" },
  OPERATOR: { chip: "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25" },
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nama: "",
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
      const body = { ...form, puskesmasId: form.puskesmasId ? Number(form.puskesmasId) : null };
      const url = editId ? `/api/users/${editId}` : "/api/users";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success(editId ? "Operator updated" : "Operator created");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to save operator"),
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

  function openEdit(user: any) {
    setEditId(user.id);
    setForm({
      nama: user.nama,
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
    setForm({ nama: "", email: "", password: "", role: "OPERATOR", puskesmasId: "", telegramChatId: "" });
    setShowForm(true);
  }

  const filtered = users.filter(
    (u: any) =>
      u.nama.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
          />
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-[hsl(var(--muted))]/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Tidak ada yang cocok" : "Belum ada pengguna"}
          description="Klik Tambah untuk menambahkan operator baru."
        />
      ) : (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="text-left px-5 py-3 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                  Nama
                </th>
                <th className="text-left px-4 py-3 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                  Puskesmas
                </th>
                <th className="text-right px-5 py-3 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] w-24">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => {
                const roleMeta = ROLE_META[u.role] || ROLE_META.OPERATOR;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[hsl(var(--border))]/50 last:border-0 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#00A876]/10 text-[#00A876] flex items-center justify-center text-[11px] font-extrabold shrink-0">
                          {u.nama.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{u.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center h-6 px-2.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${roleMeta.chip}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
                      {u.puskesmas ? u.puskesmas.nama : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(u)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[#00A876]/10 hover:text-[#00A876] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus "${u.nama}"?`)) deleteMutation.mutate(u.id);
                          }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[#E15A4F]/10 hover:text-[#E15A4F] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Ubah Operator" : "Tambah Operator"}
        description={editId ? "Perbarui data akun" : "Buat akun pengguna baru"}
        icon={<Users className="w-4.5 h-4.5" />}
        size="sm"
        variant="hero"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 px-5 rounded-full text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-full bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold uppercase tracking-wider hover:brightness-95 transition disabled:opacity-50"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Nama</label>
            <input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              required
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Password {editId && <span className="font-medium normal-case">(kosongkan jika tetap)</span>}
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              required={!editId}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className={inputCls}
              >
                <option value="ADMIN">Admin</option>
                <option value="OPERATOR">Operator</option>
                <option value="DINKES">Dinkes</option>
              </select>
            </div>
            {form.role === "OPERATOR" && (
              <div>
                <label className={labelCls}>Puskesmas</label>
                <select
                  value={form.puskesmasId}
                  onChange={(e) => setForm({ ...form, puskesmasId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">— Pilih —</option>
                  {puskesmasList.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>
              Telegram Chat ID <span className="font-medium normal-case">(opsional)</span>
            </label>
            <input
              value={form.telegramChatId}
              onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
              placeholder="Contoh: 123456789"
              className={inputCls}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
