"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bot, Building2, Copy, ShieldAlert, Sparkles, Target, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { MasterCrud } from "@/components/master-crud";
import { SystemHealthDashboard } from "@/components/system-health-dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import AISettingsPage from "./ai/page";
import TelegramSettingsPage from "./telegram/page";
import UsersPage from "./users/page";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Target management ────────────────────────────────────────────────────────

function targetTier(pct: number) {
  if (pct >= 80) return { bar: "#00A876", text: "#00A876", soft: "rgba(0,168,118,0.12)" };
  if (pct >= 60) return { bar: "#E8A33D", text: "#C07F1F", soft: "rgba(232,163,61,0.14)" };
  return { bar: "#E15A4F", text: "#E15A4F", soft: "rgba(225,90,79,0.12)" };
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
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2">
        <input
          type="number"
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          className="w-24 h-10 px-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[13px] font-extrabold text-center tabular-nums text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
        />
        <select
          value={selectedPkmId}
          onChange={(e) => setSelectedPkmId(e.target.value)}
          className="h-10 px-3.5 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-bold text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors cursor-pointer"
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
            className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#BEF264] text-[#06281E] text-[11px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            {bulkCopyMutation.isPending ? "Menyalin..." : "Salin ke Semua Puskesmas"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl bg-[hsl(var(--muted))]/50 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Tidak ada kategori"
          description="Belum ada kategori laporan yang bisa diberi target."
        />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => {
            const currentTarget = getTarget(cat.id);
            const isEditing = editingId === cat.id;
            const t = targetTier(currentTarget);
            return (
              <div
                key={cat.id}
                className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-4 flex items-center gap-4 hover:border-[#00A876]/30 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-[#0C1B16] flex items-center justify-center text-[18px] shrink-0">
                  {cat.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[hsl(var(--foreground))] truncate">{cat.nama}</p>
                  <p className="text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] mt-0.5">
                    {cat.code}
                  </p>
                </div>
                <div className="hidden sm:block w-36 shrink-0">
                  <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(currentTarget, 100)}%`, background: t.bar }}
                    />
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      min={0}
                      max={100}
                      autoFocus
                      className="w-16 h-9 px-2 text-center rounded-xl bg-[hsl(var(--background))] border border-[#00A876] text-[13px] font-extrabold tabular-nums text-[hsl(var(--foreground))] outline-none"
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
                    className="shrink-0 inline-flex items-center h-8 px-3 rounded-full text-[13px] font-extrabold tabular-nums transition hover:brightness-95"
                    style={{ background: t.soft, color: t.text }}
                    title="Klik untuk ubah"
                  >
                    {currentTarget}%
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    { key: "puskesmas", label: "Puskesmas", icon: Building2 },
    { key: "target", label: "Target", icon: Target },
    { key: "users", label: "Pengguna", icon: Users },
    { key: "telegram", label: "Telegram", icon: Bot },
    { key: "ai", label: "AI Import", icon: Sparkles },
    { key: "health", label: "Status Sistem", icon: Activity },
  ];

  return (
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO + TABS (pola audit-log) ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#BEF264] opacity-[0.05]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />

        <div className="relative z-10 px-8 pt-7 pb-5">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Sistem</p>
          <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Pengaturan</h1>
          <p className="text-[13px] font-medium text-white/50 mt-2">
            Master data, target capaian, pengguna, dan integrasi
          </p>

          <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 p-1 max-w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? "bg-[#BEF264] text-[#06281E]" : "text-white/60 hover:text-white"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="pt-6">
        {activeTab === "puskesmas" && <MasterCrud title="Master Puskesmas" apiUrl="/api/master/puskesmas" />}
        {activeTab === "target" && <TargetManagement />}
        {activeTab === "users" && <UsersPage />}
        {activeTab === "telegram" && <TelegramSettingsPage />}
        {activeTab === "ai" && <AISettingsPage />}
        {activeTab === "health" && <SystemHealthDashboard />}
      </div>
    </div>
  );
}
