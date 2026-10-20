"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  Building2,
  Copy,
  FileSpreadsheet,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "tamagui";
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
      <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface border border-border shadow-subtle p-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tahun:</span>
          <input
            type="number"
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            className="w-24 h-10 px-3 rounded-xl bg-surface border border-border text-[13px] font-bold text-center tabular-nums text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-subtle transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fasilitas:</span>
          <select
            value={selectedPkmId}
            onChange={(e) => setSelectedPkmId(e.target.value)}
            className="h-10 px-3.5 rounded-xl bg-surface border border-border text-[12px] font-semibold text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-subtle transition-all cursor-pointer"
          >
            <option value="global">Target Global (Semua Puskesmas)</option>
            {puskesmasList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nama}
              </option>
            ))}
          </select>
        </div>
        {selectedPkmId === "global" && (
          <button
            onClick={() => bulkCopyMutation.mutate()}
            disabled={bulkCopyMutation.isPending}
            className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-white text-[11px] font-bold hover:bg-primary-hover shadow-subtle transition-all disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" />
            {bulkCopyMutation.isPending ? "Menyalin..." : "Salin ke Semua Puskesmas"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-card bg-surface border border-border/60 animate-pulse" />
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
              <div
                key={cat.id}
                className="rounded-card bg-surface border border-border shadow-subtle px-5 py-3.5 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <span className="w-10 h-10 rounded-xl bg-surface-subtle border border-border flex items-center justify-center text-[18px] shrink-0">
                  {cat.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-foreground truncate">{cat.nama}</p>
                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {cat.code}
                  </p>
                </div>
                <div className="hidden sm:block w-36 shrink-0">
                  <div className="h-2 bg-surface-subtle rounded-full overflow-hidden border border-border/40">
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
                      className="w-16 h-9 px-2 text-center rounded-xl bg-surface border border-primary text-[13px] font-bold tabular-nums text-foreground outline-none ring-1 ring-primary"
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
                    <span className="text-[11px] font-bold text-muted-foreground">%</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(cat.id);
                      setEditValue(String(currentTarget));
                    }}
                    className="shrink-0 inline-flex items-center h-8 px-3 rounded-full text-[12px] font-bold tabular-nums transition hover:brightness-95 border border-border/40"
                    style={{ background: t.soft, color: t.text }}
                    title="Klik untuk ubah target"
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
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen bg-canvas">
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8 text-error" />}
          title="Akses Ditolak"
          description="Hanya administrator yang dapat mengelola pengaturan sistem."
        />
      </div>
    );
  }

  const tabs = [
    { key: "puskesmas", label: "Puskesmas", icon: Building2, desc: "Master faskes" },
    { key: "target", label: "Target", icon: Target, desc: "Capaian tahunan" },
    { key: "users", label: "Pengguna", icon: Users, desc: "Akun & peran" },
    { key: "telegram", label: "Telegram", icon: Bot, desc: "Notifikasi bot" },
    { key: "ai", label: "AI Import", icon: Sparkles, desc: "Model & parser" },
    { key: "health", label: "Status Sistem", icon: Activity, desc: "Telemetri live" },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 fade-in bg-canvas min-h-screen">
      {/* ── HERO (Tamagui Clean Bento) ── */}
      <Card className="relative overflow-hidden rounded-card bg-surface text-foreground border border-border shadow-subtle p-0">
        <div className="relative z-10 px-6 sm:px-8 py-6 sm:py-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-2">
              Sistem & Konfigurasi
            </p>
            <h1 className="text-[26px] sm:text-[32px] font-black tracking-tight leading-none text-foreground">
              Pengaturan
            </h1>
            <p className="text-[13px] font-medium text-muted-foreground mt-2">
              Master data, target capaian, manajemen pengguna, dan integrasi API
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/settings/import"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-surface-subtle hover:bg-surface text-foreground text-[11px] font-bold transition-all border border-border shadow-subtle"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
              Import Excel
            </Link>
            <Link
              href="/settings/errors"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-surface-subtle hover:bg-surface text-foreground text-[11px] font-bold transition-all border border-border shadow-subtle"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Log Error
            </Link>
          </div>
        </div>
      </Card>

      {/* ── BENTO SETTINGS GRID ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-card bg-surface border text-left p-3.5 sm:p-4 transition-all duration-180 flex flex-col justify-between group cursor-pointer ${
                isActive
                  ? "border-primary bg-primary-subtle/50 ring-1 ring-primary shadow-subtle"
                  : "border-border shadow-subtle hover:border-border-hover hover:bg-surface-hover hover:shadow-md"
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-surface-subtle text-muted-foreground group-hover:text-primary group-hover:bg-primary-subtle"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div>
                <p
                  className={`text-[12px] sm:text-[13px] font-bold leading-tight ${isActive ? "text-primary" : "text-foreground"}`}
                >
                  {tab.label}
                </p>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                  {tab.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── CONTENT CONTAINER ── */}
      <div className="pt-2">
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
