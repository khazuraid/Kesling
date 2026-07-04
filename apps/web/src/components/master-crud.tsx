"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Modal } from "@/components/ui/modal";

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
          <input
            placeholder="Cari nama data..."
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

      {/* Filter tabs */}
      {hasKategori && kategoriOptions && (
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setFilterKategori("")}
            className={`shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              !filterKategori
                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]"
                : "text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
            }`}
          >
            Semua
          </button>
          {kategoriOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setFilterKategori(o.value)}
              className={`shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                filterKategori === o.value
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]"
                  : "text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[hsl(var(--border))]">
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-10 text-center">
                No
              </th>
              <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Nama
              </th>
              {hasKategori && (
                <th className="text-left px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Kategori
                </th>
              )}
              <th className="text-right px-4 py-2.5 text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider w-24">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[hsl(var(--border))]/50">
                  <td colSpan={hasKategori ? 4 : 3} className="px-4 py-3">
                    <div className="h-5 w-3/4 bg-[hsl(var(--muted))] animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={hasKategori ? 4 : 3} className="px-4 py-16 text-center">
                  <Building2 className="w-8 h-8 mx-auto mb-3 text-[hsl(var(--muted-foreground))] opacity-30" />
                  <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">
                    {search ? "Tidak ada data yang cocok" : "Belum ada data terdaftar"}
                  </p>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-1">
                    Klik Tambah untuk menambahkan data baru
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item, i) => (
                <tr
                  key={item.id}
                  className="border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-[11px] font-bold text-[hsl(var(--foreground))] shrink-0">
                        {item.nama.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-[12px] font-bold text-[hsl(var(--foreground))]">{item.nama}</span>
                    </div>
                  </td>
                  {hasKategori && (
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                        {item.kategori || "—"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="w-7 h-7 flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus "${item.nama}"?`)) deleteMutation.mutate(item.id);
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

      <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
        Menampilkan {filtered.length} dari {items.length} data
      </p>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? "Ubah Data" : "Tambah Data"}
        size="sm"
        footer={
          <form
            id="master-form"
            onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
            className="flex gap-2 w-full"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors flex-1"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="h-9 px-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--accent))] hover:text-white transition-colors flex-1"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
              Nama
            </label>
            <input
              {...form.register("nama")}
              placeholder="Nama entitas..."
              className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
            />
            {form.formState.errors.nama && (
              <p className="text-[11px] font-bold text-[hsl(var(--error))] mt-1">
                {form.formState.errors.nama.message}
              </p>
            )}
          </div>
          {hasKategori && kategoriOptions && (
            <div>
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-1.5">
                Kategori
              </label>
              <select
                {...form.register("kategori")}
                className="w-full h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors appearance-none"
              >
                <option value="">— Tanpa Kategori —</option>
                {kategoriOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
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
