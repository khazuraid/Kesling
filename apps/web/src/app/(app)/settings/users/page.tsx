"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openAdd} className="rounded-full gap-2 shadow-xs">
          <Plus className="w-3.5 h-3.5" /> Tambah Operator
        </Button>
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
          title={search ? "Tidak ada yang cocok" : "Belum ada pengguna"}
          description="Klik Tambah Operator untuk menambahkan akun staf atau administrator baru."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Puskesmas</TableHead>
                  <TableHead className="text-right w-24">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u: any) => {
                  const roleMeta = ROLE_META[u.role] || ROLE_META.OPERATOR;
                  return (
                    <TableRow key={u.id} className="hover:bg-surface-subtle transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-primary-subtle text-primary border border-primary/20">
                            <AvatarFallback className="font-bold text-xs bg-primary-subtle text-primary">
                              {u.nama.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[12px] font-bold text-foreground">{u.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] font-medium text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={roleMeta.variant} className="text-[10px] uppercase">
                          {roleMeta.label || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[12px] font-medium text-muted-foreground">
                        {u.puskesmas ? u.puskesmas.nama : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-primary-subtle hover:text-primary"
                            title="Ubah operator"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Hapus "${u.nama}"?`)) deleteMutation.mutate(u.id);
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Hapus operator"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
