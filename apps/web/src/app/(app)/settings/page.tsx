"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Copy, Settings2, ShieldAlert, Target, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { MasterCrud } from "@/components/master-crud";
import { EmptyState } from "@/components/ui/empty-state";
import UsersPage from "./users/page";

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

function TargetManagement() {
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
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-20 h-9 px-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
          />
        </div>
        <select
          value={selectedPkmId}
          onChange={(e) => setSelectedPkmId(e.target.value)}
          className="h-9 px-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors cursor-pointer"
        >
          <option value="global">Target Global</option>
          {puskesmasList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>
        {selectedPkmId === "global" && (
          <button
            onClick={() => bulkCopyMutation.mutate()}
            disabled={bulkCopyMutation.isPending}
            className="h-9 px-3 border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <Copy className="w-3 h-3" />
            {bulkCopyMutation.isPending ? "Menyalin..." : "Salin ke Semua"}
          </button>
        )}
      </div>

      {/* Category cards */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-[hsl(var(--muted))] animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-12 text-center border border-[hsl(var(--border))]">
          <Target className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground))] opacity-30" />
          <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak ada kategori</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {categories.map((cat) => {
            const currentTarget = getTarget(cat.id);
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[hsl(var(--foreground))] truncate">{cat.nama}</p>
                    <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      {cat.code}
                    </p>
                  </div>
                  {/* Target value + progress bar */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          min={0}
                          max={100}
                          className="w-16 h-8 px-2 text-center bg-[hsl(var(--background))] border border-[hsl(var(--accent))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none"
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
                        <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">%</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(cat.id);
                          setEditValue(String(currentTarget));
                        }}
                        className="text-[18px] font-bold text-[hsl(var(--foreground))] tabular-nums hover:text-[hsl(var(--accent))] transition-colors min-w-[3ch] text-right"
                        title="Klik untuk ubah"
                      >
                        {currentTarget}
                      </button>
                    )}
                    <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))]">%</span>
                    <div className="w-20 h-1.5 bg-[hsl(var(--muted))] hidden sm:block">
                      <div
                        className="h-full bg-[hsl(var(--foreground))] transition-all"
                        style={{ width: `${Math.min(currentTarget, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("puskesmas");

  if ((session?.user as any)?.role !== "ADMIN") {
    return (
      <div className="w-full mx-auto pt-0 pb-4">
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8" />}
          title="Akses Ditolak"
          description="Hanya administrator yang dapat mengelola pengaturan sistem."
        />
      </div>
    );
  }

  const tabs = [
    { key: "puskesmas", label: "Puskesmas", icon: <Building2 className="w-3.5 h-3.5" /> },
    { key: "target", label: "Target", icon: <Target className="w-3.5 h-3.5" /> },
    { key: "users", label: "Pengguna", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings2 className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Pengaturan</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Master data, target, dan pengguna</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 border-b border-[hsl(var(--border))]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
                : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "puskesmas" && <MasterCrud title="Master Puskesmas" apiUrl="/api/master/puskesmas" />}
      {activeTab === "target" && <TargetManagement />}
      {activeTab === "users" && <UsersPage />}
    </div>
  );
}
