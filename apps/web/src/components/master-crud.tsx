"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export function MasterCrud({ apiUrl, hasKategori, kategoriOptions }: Props) {
  const [showModal, setShowModal] = useState(false);
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
    refetchInterval: 5000,
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
      setShowModal(false);
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
    onSuccess: () => {
      toast.success("Data berhasil dihapus");
      invalidate();
    },
    onError: () => toast.error("Gagal menghapus. Pastikan data tidak digunakan di laporan."),
  });

  function openAdd() {
    setEditId(null);
    form.reset({ nama: "", kategori: kategoriOptions?.[0]?.value || "" });
    setShowModal(true);
  }

  function openEdit(item: MasterItem) {
    setEditId(item.id);
    form.reset({ nama: item.nama, kategori: item.kategori || "" });
    setShowModal(true);
  }

  const filtered = items.filter((i) => i.nama.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Toolbar: search + add */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-subtle">
          <Plus className="w-3.5 h-3.5" /> Tambah
        </Button>
      </div>

      {/* Filter tabs */}
      {hasKategori && kategoriOptions && (
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-subtle border border-border rounded-xl">
          <Button
            type="button"
            variant={!filterKategori ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterKategori("")}
            className="shrink-0 h-8 px-3.5 text-[10px] font-extrabold uppercase tracking-wider"
          >
            Semua
          </Button>
          {kategoriOptions.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant={filterKategori === o.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilterKategori(o.value)}
              className="shrink-0 h-8 px-3.5 text-[10px] font-extrabold uppercase tracking-wider"
            >
              {o.label}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden overflow-x-auto shadow-subtle">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center text-[10px] uppercase font-extrabold">No</TableHead>
              <TableHead className="text-[10px] uppercase font-extrabold">Nama</TableHead>
              {hasKategori && <TableHead className="text-[10px] uppercase font-extrabold">Kategori</TableHead>}
              <TableHead className="text-right text-[10px] uppercase font-extrabold w-24">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={hasKategori ? 4 : 3} className="px-4 py-3">
                    <div className="h-5 w-3/4 bg-surface-subtle animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasKategori ? 4 : 3} className="px-4 py-16 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-[13px] font-bold text-foreground">
                    {search ? "Tidak ada data yang cocok" : "Belum ada data terdaftar"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Klik Tambah untuk menambahkan data baru</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, i) => (
                <TableRow key={item.id} className="hover:bg-surface-subtle/40 transition-colors">
                  <TableCell className="text-center text-[11px] font-medium text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center text-[11px] font-extrabold shrink-0">
                        {item.nama.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-bold text-foreground">{item.nama}</span>
                    </div>
                  </TableCell>
                  {hasKategori && (
                    <TableCell>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {item.kategori || "—"}
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(item)}
                        className="w-7 h-7 p-0 text-muted-foreground hover:bg-surface-subtle hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Hapus "${item.nama}"?`)) deleteMutation.mutate(item.id);
                        }}
                        className="w-7 h-7 p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Menampilkan {filtered.length} dari {items.length} data
      </p>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "Edit Data" : "Tambah Data"}>
        <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nama</Label>
            <Input {...form.register("nama")} placeholder="Contoh: Puskesmas Sukajadi" />
            {form.formState.errors.nama && (
              <p className="text-[10px] text-red-600 mt-1">{form.formState.errors.nama.message}</p>
            )}
          </div>

          {hasKategori && kategoriOptions && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Kategori
              </Label>
              <Select {...form.register("kategori")} className="text-[12px] font-medium">
                {kategoriOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
