"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "", password: "", role: "OPERATOR", puskesmasId: "" });
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
    setForm({ nama: user.nama, email: user.email, password: "", role: user.role, puskesmasId: user.puskesmasId || "" });
    setShowForm(true);
  }

  function openAdd() {
    setEditId(null);
    setForm({ nama: "", email: "", password: "", role: "OPERATOR", puskesmasId: "" });
    setShowForm(true);
  }

  const filtered = users.filter(
    (u: any) =>
      u.nama.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Manajemen Pengguna</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Kelola operator dan akses</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
          />
        </div>
        <button
          onClick={openAdd}
          className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors h-9 px-4 text-[11px]"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah
        </button>
      </div>

      {/* Table */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Nama
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Email
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Role
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Puskesmas
              </th>
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-24">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-[hsl(var(--border))]/50">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-5 w-3/4 bg-[hsl(var(--muted))] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Users className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--muted-foreground))] opacity-30" />
                  <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">
                    {search ? "Tidak ada yang cocok" : "Belum ada pengguna"}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                    Klik Tambah untuk menambahkan operator
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-[11px] font-bold text-[hsl(var(--foreground))] shrink-0">
                        {u.nama.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{u.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${u.role === "ADMIN" ? "text-[hsl(var(--muted-foreground))]" : "text-[hsl(var(--success))]"}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] font-medium text-[hsl(var(--muted-foreground))]">
                    {u.puskesmas ? u.puskesmas.nama : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="w-7 h-7 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus "${u.nama}"?`)) deleteMutation.mutate(u.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--error))] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Ubah Operator" : "Tambah Operator"}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Nama
            </label>
            <input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              required
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              required
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Password {editId && <span className="font-medium normal-case">(kosongkan jika tetap)</span>}
            </label>
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              required={!editId}
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
            >
              <option value="ADMIN">Admin</option>
              <option value="OPERATOR">Operator</option>
            </select>
          </div>
          {form.role === "OPERATOR" && (
            <div>
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
                Puskesmas
              </label>
              <select
                value={form.puskesmasId}
                onChange={(e) => setForm({ ...form, puskesmasId: e.target.value })}
                className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
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
      </Modal>
    </div>
  );
}
