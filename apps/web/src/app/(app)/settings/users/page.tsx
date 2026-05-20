"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: "", email: "", password: "", role: "OPERATOR", puskesmasId: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });
  const { data: puskesmasList = [] } = useQuery<any[]>({
    queryKey: ["master", "puskesmas"],
    queryFn: () => fetch("/api/master/puskesmas").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...form, puskesmasId: form.puskesmasId ? Number(form.puskesmasId) : null };
      const url = editId ? `/api/users/${editId}` : "/api/users";
      const res = await fetch(url, { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success(editId ? "User diupdate" : "User ditambahkan");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Gagal menyimpan user"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { toast.success("User dihapus"); queryClient.invalidateQueries({ queryKey: ["users"] }); },
    onError: () => toast.error("Gagal menghapus user"),
  });

  function openEdit(user: any) {
    setEditId(user.id);
    setForm({ nama: user.nama, email: user.email, password: "", role: user.role, puskesmasId: user.puskesmasId || "" });
    setShowForm(true);
  }

  const filtered = users.filter((u: any) =>
    u.nama.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{users.length} pengguna terdaftar</p>
        </div>
        <Button
          onClick={() => { setEditId(null); setForm({ nama: "", email: "", password: "", role: "OPERATOR", puskesmasId: "" }); setShowForm(true); }}
          className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
        >
          + Tambah User
        </Button>
      </div>

      {/* Table Card */}
      <div className="card">
        {/* Search */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="relative w-full sm:w-72">
            <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Puskesmas</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => (
                <tr key={u.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-xs font-bold text-[hsl(var(--primary))]">
                        {u.nama.charAt(0)}
                      </div>
                      <span className="font-medium">{u.nama}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{u.puskesmas?.nama || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(u)} className="px-2 py-1 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => { if (confirm("Yakin hapus user ini?")) deleteMutation.mutate(u.id); }}
                      className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded transition-colors ml-1"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[hsl(var(--muted-foreground))]">Tidak ada user ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit User" : "Tambah User Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4 mt-2">
            <div>
              <Label>Nama</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required />
            </div>
            <div>
              <Label>Password {editId && <span className="text-xs text-[hsl(var(--muted-foreground))] font-normal">(kosongkan jika tidak diubah)</span>}</Label>
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="password" required={!editId} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Admin</option>
                <option value="OPERATOR">Operator</option>
              </Select>
            </div>
            {form.role === "OPERATOR" && (
              <div>
                <Label>Puskesmas</Label>
                <Select value={form.puskesmasId} onChange={(e) => setForm({ ...form, puskesmasId: e.target.value })}>
                  <option value="">— Pilih Puskesmas —</option>
                  {puskesmasList.map((p: any) => (<option key={p.id} value={p.id}>{p.nama}</option>))}
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white">
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
