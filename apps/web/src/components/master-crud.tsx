"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const masterSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  kategori: z.string().optional(),
});

type MasterForm = z.infer<typeof masterSchema>;

interface MasterItem {
  id: number;
  nama: string;
  kategori?: string;
  urutan: number;
}

interface Props {
  title: string;
  apiUrl: string;
  hasKategori?: boolean;
  kategoriOptions?: { label: string; value: string }[];
}

export function MasterCrud({ title, apiUrl, hasKategori, kategoriOptions }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterKategori, setFilterKategori] = useState("");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<MasterItem[]>({
    queryKey: ["master", apiUrl, filterKategori],
    queryFn: async () => {
      const params = filterKategori ? `?kategori=${filterKategori}` : "";
      return fetch(`${apiUrl}${params}`).then((r) => r.json());
    },
  });

  const form = useForm<MasterForm>({
    resolver: zodResolver(masterSchema),
    defaultValues: { nama: "", kategori: kategoriOptions?.[0]?.value || "" },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["master", apiUrl] });

  const saveMutation = useMutation({
    mutationFn: async (data: MasterForm) => {
      const url = editId ? `${apiUrl}/${editId}` : apiUrl;
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success(editId ? "Data berhasil diupdate" : "Data berhasil ditambahkan");
      setShowDialog(false);
      setEditId(null);
      form.reset();
      invalidate();
    },
    onError: () => toast.error("Gagal menyimpan data"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${apiUrl}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { toast.success("Data berhasil dihapus"); invalidate(); },
    onError: () => toast.error("Gagal menghapus. Pastikan data tidak digunakan di laporan."),
  });

  function openAdd() {
    setEditId(null);
    form.reset({ nama: "", kategori: kategoriOptions?.[0]?.value || "" });
    setShowDialog(true);
  }

  function openEdit(item: MasterItem) {
    setEditId(item.id);
    form.reset({ nama: item.nama, kategori: item.kategori || "" });
    setShowDialog(true);
  }

  const filtered = items.filter((i) => i.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">{items.length} data terdaftar</p>
        </div>
        <Button onClick={openAdd}>+ Tambah Data</Button>
      </div>

      {/* Table Card */}
      <div className="card">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-[hsl(var(--border))]">
          <div className="relative w-full sm:w-72">
            <svg aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              placeholder="Cari nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[hsl(var(--input))] bg-transparent placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/20 focus:border-[hsl(var(--primary))]"
            />
          </div>
          {hasKategori && kategoriOptions && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterKategori("")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!filterKategori ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
              >
                Semua
              </button>
              {kategoriOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setFilterKategori(o.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filterKategori === o.value ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Nama</th>
                {hasKategori && <th className="px-4 py-3 text-left text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Kategori</th>}
                <th className="px-4 py-3 text-right text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[hsl(var(--border))]">
                    <td colSpan={hasKategori ? 4 : 3} className="px-4 py-3"><div className="h-4 bg-[hsl(var(--muted))] rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={hasKategori ? 4 : 3} className="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
                    {search ? "Tidak ada data yang cocok" : "Belum ada data"}
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => (
                  <tr key={item.id} className="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]/50 transition-colors">
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))]">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center text-xs font-bold text-[hsl(var(--primary))]">
                          {item.nama.charAt(0)}
                        </div>
                        <span className="font-medium">{item.nama}</span>
                      </div>
                    </td>
                    {hasKategori && (
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                          {item.kategori}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(item)} className="px-2 py-1 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 rounded-md transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => { if (confirm(`Hapus "${item.nama}"?`)) deleteMutation.mutate(item.id); }}
                        className="px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-md transition-colors ml-1"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
          Menampilkan {filtered.length} dari {items.length} data
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Data" : "Tambah Data Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4 mt-2">
            <div>
              <Label>Nama</Label>
              <Input {...form.register("nama")} placeholder="Masukkan nama..." className="mt-1.5" />
              {form.formState.errors.nama && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.nama.message}</p>
              )}
            </div>
            {hasKategori && kategoriOptions && (
              <div>
                <Label>Kategori</Label>
                <Select {...form.register("kategori")} className="mt-1.5">
                  {kategoriOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </Select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
