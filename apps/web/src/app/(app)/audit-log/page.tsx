"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bug,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Database,
  Download,
  Filter,
  Pause,
  Play,
  Search,
  Shield,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number | null;
  userId: number;
  user: { id: number; nama: string; email: string; role: string };
  createdAt: string;
  oldData?: any;
  newData?: any;
}
interface SecurityLog {
  id: number;
  eventType: string;
  ip: string;
  path: string | null;
  userAgent: string | null;
  detail: string | null;
  createdAt: string;
}
interface ErrorLog {
  id: number;
  message: string;
  stack: string | null;
  path: string | null;
  userEmail: string | null;
  createdAt: string;
}
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Tier meta ────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { chip: string; dot: string }> = {
  CREATE: { chip: "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25", dot: "bg-[#00A876]" },
  UPDATE: { chip: "bg-[#E8A33D]/10 text-[#C07F1F] border border-[#E8A33D]/25", dot: "bg-[#E8A33D]" },
  DELETE: { chip: "bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25", dot: "bg-[#E15A4F]" },
};
const SECURITY_META: Record<string, { chip: string; dot: string }> = {
  LOGIN_SUCCESS: { chip: "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/25", dot: "bg-[#00A876]" },
  LOGIN_FAILED: { chip: "bg-[#E8A33D]/10 text-[#C07F1F] border border-[#E8A33D]/25", dot: "bg-[#E8A33D]" },
  RATE_LIMIT: { chip: "bg-[#5B8DEF]/10 text-[#5B8DEF] border border-[#5B8DEF]/25", dot: "bg-[#5B8DEF]" },
  BRUTE_FORCE: { chip: "bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25", dot: "bg-[#E15A4F]" },
  SUSPICIOUS: { chip: "bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25", dot: "bg-[#E15A4F]" },
};
const FALLBACK_META = {
  chip: "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]",
  dot: "bg-[hsl(var(--muted-foreground))]",
};

const PAGE_SIZE = 25;
type Tab = "audit" | "security" | "errors";

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const queryClient = useQueryClient();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = sp.get("tab");
    return t === "security" || t === "errors" ? t : "audit";
  });
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // ── Queries ──
  const { data: auditData, isLoading: auditLoading } = useQuery<PaginatedResponse<AuditLog>>({
    queryKey: ["audit-log", search, actionFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(page));
      if (search) params.set("search", search);
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/audit-log?${params}`);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: tab === "audit",
  });

  const { data: securityData, isLoading: securityLoading } = useQuery<PaginatedResponse<SecurityLog>>({
    queryKey: ["security-log", page, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(page));
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/security-log?${params}`);
      if (!res.ok) throw new Error("Gagal memuat");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: tab === "security",
  });

  const { data: errorData, isLoading: errorsLoading } = useQuery<{ logs: ErrorLog[] }>({
    queryKey: ["system-errors"],
    queryFn: async () => {
      const res = await fetch("/api/system-errors");
      if (!res.ok) throw new Error("Gagal memuat log error");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: tab === "errors",
  });

  // ── Error mutations ──
  const clearErrorsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system-errors", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal membersihkan log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Semua log error dibersihkan");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      setExpandedId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteErrorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/system-errors?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Log error dihapus");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      setExpandedId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Derived ──
  const isAudit = tab === "audit";
  const isSecurity = tab === "security";
  const isErrors = tab === "errors";

  const items: any[] = isErrors ? errorData?.logs || [] : (isAudit ? auditData : securityData)?.data || [];
  const total = isErrors ? items.length : (isAudit ? auditData : securityData)?.total || 0;
  const totalPages = isErrors ? 1 : (isAudit ? auditData : securityData)?.totalPages || 1;
  const isLoading = isAudit ? auditLoading : isSecurity ? securityLoading : errorsLoading;

  function handleExport() {
    if (isErrors) return;
    const params = new URLSearchParams();
    params.set("limit", "10000");
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const endpoint = isAudit ? "/api/audit-log" : "/api/security-log";
    window.open(`${endpoint}?${params}`, "_blank");
  }

  function parseJson(v: any) {
    if (!v) return null;
    try {
      return typeof v === "string" ? JSON.parse(v) : v;
    } catch {
      return null;
    }
  }

  function formatChanges(item: any) {
    const oldData = parseJson(item?.oldData);
    const newData = parseJson(item?.newData);

    if (item?.action === "UPDATE") {
      const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
      const changed = allKeys.filter((k) => JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k]));
      if (changed.length === 0)
        return <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Tidak ada perubahan tercatat</span>;
      return (
        <div className="space-y-2.5">
          {changed.map((k) => (
            <div key={k}>
              <span className="text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em] block mb-1">
                {k}
              </span>
              <div className="flex flex-wrap gap-2 items-center text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-[#E15A4F]/10 text-[#E15A4F] line-through">
                  {oldData?.[k] !== undefined ? String(oldData?.[k]) : "—"}
                </span>
                <span className="text-[hsl(var(--muted-foreground))]">→</span>
                <span className="px-2 py-0.5 rounded-md bg-[#00A876]/10 text-[#00A876]">
                  {newData?.[k] !== undefined ? String(newData?.[k]) : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const data = item?.action === "DELETE" ? oldData : newData;
    if (!data || Object.keys(data).length === 0)
      return <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Tidak ada detail</span>;
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px]">
            <span className="text-[hsl(var(--muted-foreground))] min-w-[120px] shrink-0">{k}:</span>
            <span className="font-mono break-all">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "audit", label: "Aktivitas", icon: Activity },
    { key: "security", label: "Keamanan", icon: Shield },
    { key: "errors", label: "Error", icon: Bug, count: errorData?.logs?.length },
  ];

  // ═══════════════════ RENDER ═══════════════════
  return (
    <div className="w-full mx-auto pb-4 fade-in">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden bg-[#0C1B16] text-white">
        <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#00A876] opacity-[0.12]" />
        <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[#E15A4F] opacity-[0.06]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,#123527_0%,transparent_55%)]" />

        <div className="relative z-10 px-8 pt-7 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#7CF5CE]/60 mb-2">Sistem</p>
              <h1 className="text-[30px] font-black tracking-[-0.03em] leading-none">Log & Pemantauan</h1>
              <p className="text-[13px] font-medium text-white/50 mt-2">
                Riwayat aktivitas, keamanan, dan error sistem
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                title={autoRefresh ? "Matikan auto-refresh" : "Nyalakan auto-refresh"}
                className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-[11px] font-extrabold transition ${
                  autoRefresh
                    ? "bg-[#BEF264] text-[#06281E]"
                    : "bg-white/[0.08] border border-white/15 text-white hover:bg-white/[0.14]"
                }`}
              >
                {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {autoRefresh ? "Live" : "Paused"}
              </button>
              {isErrors ? (
                items.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Hapus semua log error?")) clearErrorsMutation.mutate();
                    }}
                    disabled={clearErrorsMutation.isPending}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#E15A4F] text-white text-[11px] font-extrabold hover:brightness-95 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" /> Bersihkan
                  </button>
                )
              ) : (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white/[0.08] border border-white/15 text-white text-[11px] font-extrabold hover:bg-white/[0.14] transition"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
              )}
            </div>
          </div>

          {/* Tabs — bottom edge hero */}
          <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                  setExpandedId(null);
                }}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${
                  tab === t.key ? "bg-[#BEF264] text-[#06281E]" : "text-white/60 hover:text-white"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      tab === t.key ? "bg-[#06281E]/15 text-[#06281E]" : "bg-[#E15A4F]/30 text-[#F5A099]"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      {!isErrors && (
        <div className="pt-5 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {isAudit ? (
              <>
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari user, tabel, atau aksi..."
                    className="w-full h-10 pl-10 pr-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
                  />
                </div>
                <div className="inline-flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1">
                  {["all", "CREATE", "UPDATE", "DELETE"].map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setActionFilter(a);
                        setPage(1);
                      }}
                      className={cn(
                        "h-8 px-3 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors",
                        actionFilter === a
                          ? "bg-[#0C1B16] text-white"
                          : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                      )}
                    >
                      {a === "all" ? "Semua" : a}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1" />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-[11px] font-extrabold transition-colors",
                showFilters || dateFrom || dateTo
                  ? "border-[#00A876] text-[#00A876]"
                  : "border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]",
              )}
            >
              <Filter className="w-3.5 h-3.5" /> Tanggal
              {(dateFrom || dateTo) && <span className="w-1.5 h-1.5 rounded-full bg-[#00A876]" />}
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Dari
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-2.5 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-[10px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                  Sampai
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-2.5 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[#00A876] transition-colors"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                  }}
                  className="h-9 px-3 text-[10px] font-extrabold text-[#E15A4F] hover:bg-[#E15A4F]/10 rounded-lg transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── LIST ── */}
      <div className={cn(isErrors ? "pt-5" : "pt-4")}>
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[#00A876] animate-spin rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={isAudit ? Activity : isSecurity ? Shield : AlertOctagon}
            title={isErrors ? "Tidak ada error terdeteksi" : "Tidak ada data"}
            description={
              isErrors
                ? "Sistem berjalan dengan lancar. Error baru akan muncul di sini otomatis."
                : "Coba ubah filter pencarian atau rentang tanggal."
            }
          />
        ) : isErrors ? (
          /* ── ERROR LIST ── */
          <div className="space-y-2">
            {items.map((log: ErrorLog) => {
              const expanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className={cn(
                    "rounded-2xl border bg-[hsl(var(--card))] overflow-hidden transition-colors",
                    expanded ? "border-[#E15A4F]/40" : "border-[hsl(var(--border))]",
                  )}
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-[hsl(var(--muted))]/30 transition-colors"
                  >
                    <span className="mt-1 w-2 h-2 rounded-full shrink-0 bg-[#E15A4F]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold font-mono text-[#E15A4F] leading-snug break-all">
                        {log.message}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-semibold text-[hsl(var(--muted-foreground))]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(log.createdAt).toLocaleString("id-ID")}
                        </span>
                        {log.userEmail && (
                          <span className="inline-flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {log.userEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center h-6 px-2.5 rounded-full bg-[#E15A4F]/10 text-[#E15A4F] border border-[#E15A4F]/25 text-[9px] font-extrabold uppercase tracking-wider">
                      {log.path || "API"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform mt-1",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 pt-4 space-y-4 border-t border-[hsl(var(--border))]/60">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-2">
                          Pesan Error
                        </p>
                        <div className="px-4 py-3 rounded-xl bg-[#E15A4F]/[0.05] border border-[#E15A4F]/20 font-mono text-[12px] text-[#E15A4F] break-all whitespace-pre-wrap">
                          {log.message}
                        </div>
                      </div>
                      {log.stack ? (
                        <div>
                          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))] mb-2">
                            Stack Trace
                          </p>
                          <pre className="px-4 py-3 rounded-xl bg-[#0C1B16] text-[#7CF5CE] font-mono text-[10px] overflow-x-auto max-h-[280px] overflow-y-auto whitespace-pre leading-relaxed">
                            {log.stack}
                          </pre>
                        </div>
                      ) : (
                        <p className="text-[11px] italic text-[hsl(var(--muted-foreground))]">
                          Tidak ada stack trace terekam.
                        </p>
                      )}
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            if (confirm("Hapus log error ini?")) deleteErrorMutation.mutate(log.id);
                          }}
                          disabled={deleteErrorMutation.isPending}
                          className="inline-flex items-center gap-2 h-9 px-5 rounded-full border border-[#E15A4F]/40 text-[#E15A4F] text-[11px] font-extrabold uppercase tracking-wider hover:bg-[#E15A4F]/10 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus Log
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* ── AUDIT / SECURITY TABLE ── */
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-5 py-3 border-b border-[hsl(var(--border))]">
              {isAudit ? (
                <>
                  <div className="w-[90px] text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Aksi
                  </div>
                  <div className="w-[150px] text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Tabel
                  </div>
                  <div className="flex-1 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    User
                  </div>
                  <div className="w-[160px] text-right text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Waktu
                  </div>
                </>
              ) : (
                <>
                  <div className="w-[110px] text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Event
                  </div>
                  <div className="w-[140px] text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    IP
                  </div>
                  <div className="flex-1 text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Detail
                  </div>
                  <div className="w-[160px] text-right text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                    Waktu
                  </div>
                </>
              )}
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {items.map((item: any) => {
                const isExpanded = expandedId === item.id;
                const meta = isAudit
                  ? ACTION_META[item.action] || FALLBACK_META
                  : SECURITY_META[item.eventType] || FALLBACK_META;
                return (
                  <Fragment key={item.id}>
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="flex items-center px-5 py-3 border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer"
                    >
                      {isAudit ? (
                        <>
                          <div className="w-[90px]">
                            <span
                              className={cn(
                                "inline-flex items-center h-6 px-2 rounded-full text-[9px] font-extrabold uppercase tracking-wider",
                                meta.chip,
                              )}
                            >
                              {item.action}
                            </span>
                          </div>
                          <div className="w-[150px] flex items-center gap-1.5">
                            <Database className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                            <span className="text-[11px] font-bold text-[hsl(var(--foreground))] truncate">
                              {item.tableName}
                            </span>
                            {item.recordId ? (
                              <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] tabular-nums">
                                #{item.recordId}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex-1 flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-[#00A876]/10 text-[#00A876] flex items-center justify-center text-[9px] font-extrabold shrink-0">
                              {item.user?.nama?.charAt(0) || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-[hsl(var(--foreground))] truncate">
                                {item.user?.nama}
                              </p>
                              <p className="text-[8px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                                {item.user?.role}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-[110px]">
                            <span
                              className={cn(
                                "inline-flex items-center h-6 px-2 rounded-full text-[9px] font-extrabold uppercase tracking-wider",
                                meta.chip,
                              )}
                            >
                              {item.eventType.replace("_", " ")}
                            </span>
                          </div>
                          <div className="w-[140px]">
                            <span className="text-[11px] font-bold text-[hsl(var(--foreground))] font-mono">
                              {item.ip}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-[hsl(var(--foreground))] truncate">
                              {item.detail || item.path || "—"}
                            </p>
                          </div>
                        </>
                      )}
                      <div className="w-[160px] flex items-center justify-end gap-2">
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-[hsl(var(--foreground))] tabular-nums">
                            {new Date(item.createdAt).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] tabular-nums">
                            {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-5 py-4 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/15">
                        {isAudit ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                                Detail Perubahan
                              </span>
                              <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                                {item.tableName} • {item.user?.nama} •{" "}
                                {new Date(item.createdAt).toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3.5 overflow-x-auto max-h-[300px] overflow-y-auto">
                              {formatChanges(item)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#C07F1F]" />
                              <span className="text-[9px] font-extrabold text-[hsl(var(--muted-foreground))] uppercase tracking-[0.15em]">
                                Detail Event
                              </span>
                            </div>
                            <div className="space-y-1.5 text-[11px] font-medium text-[hsl(var(--foreground))]">
                              <p>
                                <span className="text-[hsl(var(--muted-foreground))]">IP:</span> {item.ip}
                              </p>
                              {item.path && (
                                <p>
                                  <span className="text-[hsl(var(--muted-foreground))]">Path:</span> {item.path}
                                </p>
                              )}
                              {item.userAgent && (
                                <p>
                                  <span className="text-[hsl(var(--muted-foreground))]">User Agent:</span>{" "}
                                  <span className="text-[10px]">{item.userAgent}</span>
                                </p>
                              )}
                              {item.detail && (
                                <p>
                                  <span className="text-[hsl(var(--muted-foreground))]">Detail:</span> {item.detail}
                                </p>
                              )}
                              <p>
                                <span className="text-[hsl(var(--muted-foreground))]">Waktu:</span>{" "}
                                {new Date(item.createdAt).toLocaleString("id-ID")}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── PAGINATION ── */}
      {!isErrors && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-[11px] font-semibold text-[hsl(var(--muted-foreground))] tabular-nums">
            {total} entri • Hal {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:border-[#00A876] hover:text-[#00A876] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 flex items-center gap-1 rounded-xl border border-[hsl(var(--border))] text-[11px] font-bold text-[hsl(var(--muted-foreground))] hover:border-[#00A876] hover:text-[#00A876] disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
