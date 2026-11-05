"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ShieldAlert, Target } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";

interface DynamicCategory {
  id: number;
  nama: string;
  code: string;
  icon: string;
}

interface DynamicTarget {
  id: number;
  tahun: number;
  categoryId: number;
  puskesmasId: number | null;
  targetPersen: number;
  category: { nama: string; code: string };
}

interface Puskesmas {
  id: number;
  nama: string;
}

function targetTier(pct: number) {
  if (pct >= 80) return { bar: "#00A876", text: "#00A876", soft: "rgba(0,168,118,0.12)" };
  if (pct >= 60) return { bar: "#E8A33D", text: "#C07F1F", soft: "rgba(232,163,61,0.14)" };
  return { bar: "#E15A4F", text: "#E15A4F", soft: "rgba(225,90,79,0.12)" };
}

export default function SettingsTargetPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [selectedPkmId, setSelectedPkmId] = useState<string>("global");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: categories = [], isLoading: catLoading } = useQuery<DynamicCategory[]>({
    queryKey: ["master", "dynamic-categories"],
    queryFn: () => fetch("/api/master/dynamic-categories").then((r) => r.json()),
  });

  const { data: puskesmasList = [] } = useQuery<Puskesmas[]>({
    queryKey: ["puskesmas-list"],
    queryFn: () => fetch("/api/master/puskesmas").then((r) => r.json()),
  });

  const { data: targets = [], isLoading: targetsLoading } = useQuery<DynamicTarget[]>({
    queryKey: ["targets", tahun],
    queryFn: () => fetch(`/api/target?tahun=${tahun}`).then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ categoryId, targetPersen }: { categoryId: number; targetPersen: number }) => {
      const pkmId = selectedPkmId === "global" ? null : Number(selectedPkmId);
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahun, categoryId, puskesmasId: pkmId, targetPersen }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
    },
    onSuccess: () => {
      toast.success("Target disimpan");
      queryClient.invalidateQueries({ queryKey: ["targets", tahun] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkCopyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/target/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahun }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.count} target disalin ke semua puskesmas`);
      queryClient.invalidateQueries({ queryKey: ["targets", tahun] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if ((session?.user as any)?.role !== "ADMIN") {
    return (
      <div className="py-12">
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8 text-destructive" aria-hidden="true" />}
          title="Akses Ditolak"
          description="Hanya administrator yang dapat mengelola target sistem."
        />
      </div>
    );
  }

  const getTarget = (categoryId: number) => {
    const pkmId = selectedPkmId === "global" ? null : Number(selectedPkmId);
    const specific = targets.find((t) => t.categoryId === categoryId && t.puskesmasId === pkmId);
    if (specific) return specific.targetPersen;
    const global = targets.find((t) => t.categoryId === categoryId && t.puskesmasId === null);
    return global?.targetPersen ?? 80;
  };

  const isLoading = catLoading || targetsLoading;

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-subtle flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="target-year" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tahun:
          </label>
          <Input
            id="target-year"
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-24 h-10 text-sm font-bold text-center tabular-nums"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="target-pkm" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Fasilitas:
          </label>
          <Select
            id="target-pkm"
            value={selectedPkmId}
            onChange={(e) => setSelectedPkmId(e.target.value)}
            className="h-10 px-3.5 rounded-button text-xs font-semibold"
          >
            <option value="global">Target Global (Semua Puskesmas)</option>
            {puskesmasList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </Select>
        </div>

        {selectedPkmId === "global" && (
          <Button
            size="sm"
            onClick={() => bulkCopyMutation.mutate()}
            disabled={bulkCopyMutation.isPending}
            className="ml-auto gap-2 h-10 shadow-subtle"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{bulkCopyMutation.isPending ? "Menyalin..." : "Salin ke Semua Puskesmas"}</span>
          </Button>
        )}
      </Card>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-surface-subtle border border-border/60 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Tidak ada kategori"
          description="Belum ada kategori laporan yang bisa diberi target."
        />
      ) : (
        <div className="space-y-2.5">
          {categories.map((cat) => {
            const currentTarget = getTarget(cat.id);
            const isEditing = editingId === cat.id;
            const t = targetTier(currentTarget);
            return (
              <Card
                key={cat.id}
                className="px-5 py-3.5 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all shadow-subtle"
              >
                <span
                  className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-lg shrink-0"
                  aria-hidden="true"
                >
                  {cat.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{cat.nama}</p>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {cat.code}
                  </p>
                </div>
                <div className="hidden sm:block w-36 shrink-0">
                  <Progress value={Math.min(currentTarget, 100)} className="h-2" />
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      min={0}
                      max={100}
                      autoFocus
                      className="w-16 h-9 px-2 text-center text-sm font-bold tabular-nums"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          saveMutation.mutate({ categoryId: cat.id, targetPersen: Number(editValue) });
                          setEditingId(null);
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => {
                        saveMutation.mutate({ categoryId: cat.id, targetPersen: Number(editValue) });
                        setEditingId(null);
                      }}
                    />
                    <span className="text-xs font-bold text-muted-foreground">%</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditValue(String(currentTarget));
                    }}
                    className="shrink-0 inline-flex items-center h-8 px-3 rounded-full text-xs font-bold tabular-nums transition hover:brightness-95 border border-border/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    style={{ background: t.soft, color: t.text }}
                    title="Klik untuk ubah target"
                  >
                    {currentTarget}%
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
