"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  Download,
  FileCode,
  Key,
  Laptop,
  Pause,
  Play,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  User as UserIcon,
  Wifi,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangeInputs, FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number;
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

const PAGE_SIZE = 25;
type Tab = "security" | "audit" | "errors";

// ─── Security Event Configuration ─────────────────────────────────────────────

interface EventMeta {
  label: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO" | "SUCCESS";
  icon: any;
  borderClass: string;
  badgeClass: string;
  dotClass: string;
}

const SECURITY_EVENT_CONFIG: Record<string, EventMeta> = {
  BRUTE_FORCE: {
    label: "Brute Force Attack",
    severity: "CRITICAL",
    icon: ShieldAlert,
    borderClass: "border-l-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
  SUSPICIOUS: {
    label: "Suspicious Origin",
    severity: "HIGH",
    icon: AlertOctagon,
    borderClass: "border-l-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400",
    dotClass: "bg-rose-500",
  },
  RATE_LIMIT: {
    label: "Rate Limit Exceeded",
    severity: "WARNING",
    icon: Activity,
    borderClass: "border-l-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  LOGIN_FAILED: {
    label: "Login Failed",
    severity: "WARNING",
    icon: AlertTriangle,
    borderClass: "border-l-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  PASSWORD_RESET_ATTEMPT_UNKNOWN: {
    label: "Unknown Target Reset",
    severity: "WARNING",
    icon: Key,
    borderClass: "border-l-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  LOGIN_SUCCESS: {
    label: "Login Authorized",
    severity: "INFO",
    icon: CheckCircle2,
    borderClass: "border-l-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  PASSWORD_RESET_SUCCESS: {
    label: "Password Reset OK",
    severity: "SUCCESS",
    icon: CheckCircle2,
    borderClass: "border-l-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
  USER_APPROVAL_DECISION: {
    label: "User Approval",
    severity: "INFO",
    icon: ShieldCheck,
    borderClass: "border-l-cyan-500",
    badgeClass: "bg-cyan-500/10 text-cyan-700 border-cyan-500/30 dark:text-cyan-400",
    dotClass: "bg-cyan-500",
  },
  REGISTER_REQUESTED: {
    label: "Registration Request",
    severity: "INFO",
    icon: UserIcon,
    borderClass: "border-l-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
  REGISTER_EMAIL_VERIFIED: {
    label: "Email Verified",
    severity: "SUCCESS",
    icon: CheckCircle2,
    borderClass: "border-l-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    dotClass: "bg-emerald-500",
  },
};

const DEFAULT_EVENT_META: EventMeta = {
  label: "Security Event",
  severity: "INFO",
  icon: Shield,
  borderClass: "border-l-slate-400",
  badgeClass: "bg-muted text-muted-foreground border-border",
  dotClass: "bg-muted-foreground",
};

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "destructive",
};

// Quick user agent classifier
function parseUserAgent(ua?: string | null) {
  if (!ua) return { browser: "Unknown", os: "Unknown" };
  let browser = "Browser";
  let os = "Device";

  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("curl") || ua.includes("Postman") || ua.includes("python")) browser = "API Client";

  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const queryClient = useQueryClient();
  const sp = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const t = sp.get("tab");
    return t === "audit" || t === "errors" ? t : "security";
  });

  const [search, setSearch] = useState("");
  const [securityFilter, setSecurityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // ── Queries ──
  const isAudit = tab === "audit";
  const isSecurity = tab === "security";
  const isErrors = tab === "errors";

  const { data: securityData, isLoading: securityLoading } = useQuery<PaginatedResponse<SecurityLog>>({
    queryKey: ["security-log", page, securityFilter, search, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(page));
      if (securityFilter !== "all") params.set("eventType", securityFilter);
      if (search) params.set("ip", search);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/security-log?${params}`);
      if (!res.ok) throw new Error("Gagal memuat log keamanan");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: isSecurity,
  });

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
      if (!res.ok) throw new Error("Gagal memuat audit log");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: isAudit,
  });

  const { data: errorData, isLoading: errorsLoading } = useQuery<{ logs: ErrorLog[] }>({
    queryKey: ["system-errors"],
    queryFn: async () => {
      const res = await fetch("/api/system-errors");
      if (!res.ok) throw new Error("Gagal memuat log error");
      return res.json();
    },
    refetchInterval: autoRefresh ? 10000 : false,
    enabled: isErrors,
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
  const items: any[] = isErrors ? errorData?.logs || [] : (isSecurity ? securityData : auditData)?.data || [];
  const total = isErrors ? items.length : (isSecurity ? securityData : auditData)?.total || 0;
  const totalPages = isErrors ? 1 : (isSecurity ? securityData : auditData)?.totalPages || 1;
  const isLoading = isSecurity ? securityLoading : isAudit ? auditLoading : errorsLoading;

  // Export handler
  function handleExport() {
    if (isErrors) return;
    const params = new URLSearchParams();
    params.set("limit", "10000");
    if (isSecurity && securityFilter !== "all") params.set("eventType", securityFilter);
    if (isAudit && actionFilter !== "all") params.set("action", actionFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const endpoint = isSecurity ? "/api/security-log" : "/api/audit-log";
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

  function copyText(txt: string, label = "Data") {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} disalin ke clipboard`);
  }

  function formatChanges(item: any) {
    const oldData = parseJson(item?.oldData);
    const newData = parseJson(item?.newData);

    if (item?.action === "UPDATE") {
      const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
      const changed = allKeys.filter((k) => JSON.stringify(oldData?.[k]) !== JSON.stringify(newData?.[k]));
      if (changed.length === 0)
        return <span className="text-xs text-muted-foreground">Tidak ada perubahan field terdeteksi.</span>;

      return (
        <div className="space-y-3">
          {changed.map((k) => (
            <div key={k} className="p-3 bg-surface-subtle/70 border border-border/80 rounded-xl space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground font-mono">
                Field: {k}
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive line-through">
                  <span className="text-[9px] uppercase tracking-wider block font-sans font-bold opacity-75 mb-0.5">
                    Sebelum
                  </span>
                  {oldData?.[k] !== undefined ? String(oldData?.[k]) : "—"}
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <span className="text-[9px] uppercase tracking-wider block font-sans font-bold opacity-75 mb-0.5">
                    Sesudah
                  </span>
                  {newData?.[k] !== undefined ? String(newData?.[k]) : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const data = item?.action === "DELETE" ? oldData : newData;
    if (!data || Object.keys(data).length === 0)
      return <span className="text-xs text-muted-foreground">Tidak ada payload detail.</span>;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="p-2.5 rounded-lg bg-surface-subtle border border-border/70 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block truncate">{k}</span>
            <span className="font-mono font-bold text-foreground break-all mt-0.5 block">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: "security", label: "Insiden & Keamanan", icon: Shield, count: securityData?.total },
    { key: "audit", label: "Audit Aktivitas", icon: Activity, count: auditData?.total },
    { key: "errors", label: "Error Log", icon: Bug, count: errorData?.logs?.length },
  ];

  return (
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                  Security Operations Center & Audit Log
                </h1>
              </div>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                Telemetri keamanan live, mitigasi ancaman otomatis, riwayat mutasi database, dan log error sistem
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-1.5 rounded-full text-xs font-bold shadow-xs"
                title={autoRefresh ? "Pause live stream" : "Aktifkan auto-refresh 10 detik"}
              >
                {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autoRefresh ? "Live 10s" : "Paused"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["security-log"] });
                  queryClient.invalidateQueries({ queryKey: ["audit-log"] });
                  queryClient.invalidateQueries({ queryKey: ["system-errors"] });
                  toast.success("Log disegarkan");
                }}
                className="gap-1.5 rounded-full text-xs font-bold shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>

              {isErrors ? (
                items.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Hapus semua catatan error sistem?")) clearErrorsMutation.mutate();
                    }}
                    disabled={clearErrorsMutation.isPending}
                    className="gap-1.5 rounded-full text-xs font-bold shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Bersihkan Semua
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="gap-1.5 rounded-full text-xs font-bold shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </Button>
              )}
            </div>
          </div>

          {/* ── BENTO TELEMETRY STRIP ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <Card className="p-3 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Status Proteksi</span>
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-base sm:text-lg font-black text-foreground mt-1">Aktif & Terlindungi</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Rate Limit + CSRF Host Check</p>
            </Card>

            <Card className="p-3 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Log Keamanan</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-base sm:text-lg font-black font-mono text-foreground mt-1">
                {securityData?.total ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Insiden & event terdeteksi</p>
            </Card>

            <Card className="p-3 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Audit Mutasi DB</span>
                <Database className="w-4 h-4 text-primary" />
              </div>
              <p className="text-base sm:text-lg font-black font-mono text-foreground mt-1">
                {auditData?.total ?? "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Aktivitas Create, Update, Delete</p>
            </Card>

            <Card className="p-3 bg-surface-subtle/70 border-border/80">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-wider">Server Exceptions</span>
                <Bug className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-base sm:text-lg font-black font-mono text-foreground mt-1">
                {errorData?.logs?.length ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Error runtime terekam</p>
            </Card>
          </div>

          {/* ── TABS ── */}
          <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border p-1">
            {TABS.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant={tab === t.key ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                  setExpandedId(null);
                }}
                className={`h-8 px-4 rounded-full text-[11px] font-bold whitespace-nowrap gap-1.5 ${
                  tab === t.key ? "bg-primary text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      tab === t.key ? "bg-white/20 text-white" : "bg-primary-subtle text-primary"
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── TOOLBAR & FILTERS ── */}
        {!isErrors && (
          <div className="space-y-3">
            <FilterBar
              searchValue={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={
                isSecurity ? "Cari IP, endpoint, atau pesan ancaman..." : "Cari user, tabel, atau nomor ID..."
              }
              isFetching={isLoading}
              activeFilters={[
                ...(isSecurity && securityFilter !== "all"
                  ? [
                      {
                        key: "sec-type",
                        label: `Tipe: ${securityFilter}`,
                        onRemove: () => {
                          setSecurityFilter("all");
                          setPage(1);
                        },
                      },
                    ]
                  : []),
                ...(isAudit && actionFilter !== "all"
                  ? [
                      {
                        key: "audit-action",
                        label: `Aksi: ${actionFilter}`,
                        onRemove: () => {
                          setActionFilter("all");
                          setPage(1);
                        },
                      },
                    ]
                  : []),
                ...(dateFrom || dateTo
                  ? [
                      {
                        key: "date",
                        label: `${dateFrom || "awal"} → ${dateTo || "kini"}`,
                        onRemove: () => {
                          setDateFrom("");
                          setDateTo("");
                          setPage(1);
                        },
                      },
                    ]
                  : []),
              ]}
              onReset={() => {
                setSearch("");
                setSecurityFilter("all");
                setActionFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              {/* Event Type Pills for Security Tab */}
              {isSecurity && (
                <div className="flex flex-wrap items-center gap-1 bg-surface border border-border p-1 rounded-xl shadow-xs">
                  {[
                    { key: "all", label: "Semua" },
                    { key: "BRUTE_FORCE", label: "Brute Force" },
                    { key: "RATE_LIMIT", label: "Rate Limit" },
                    { key: "SUSPICIOUS", label: "Suspicious" },
                    { key: "LOGIN_FAILED", label: "Login Gagal" },
                    { key: "LOGIN_SUCCESS", label: "Login Sukses" },
                  ].map((evt) => (
                    <button
                      key={evt.key}
                      type="button"
                      onClick={() => {
                        setSecurityFilter(evt.key);
                        setPage(1);
                      }}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                        securityFilter === evt.key
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                      }`}
                    >
                      {evt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Filter Pills for Audit Tab */}
              {isAudit && (
                <div className="flex flex-wrap items-center gap-1 bg-surface border border-border p-1 rounded-xl shadow-xs">
                  {["all", "CREATE", "UPDATE", "DELETE"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => {
                        setActionFilter(a);
                        setPage(1);
                      }}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
                        actionFilter === a
                          ? "bg-primary text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-subtle"
                      }`}
                    >
                      {a === "all" ? "Semua" : a}
                    </button>
                  ))}
                </div>
              )}

              <DateRangeInputs
                from={dateFrom}
                to={dateTo}
                onChange={(f, t) => {
                  setDateFrom(f);
                  setDateTo(t);
                  setPage(1);
                }}
              />
            </FilterBar>
          </div>
        )}

        {/* ── MAIN CONTENT LIST ── */}
        <div>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-surface border border-border rounded-xl">
              <div className="w-8 h-8 border-2 border-border border-t-primary animate-spin rounded-full" />
              <p className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
                Mengambil telemetri data...
              </p>
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={isSecurity ? ShieldCheck : isAudit ? Activity : Bug}
              title={isErrors ? "Tidak ada exception server" : "Tidak ada catatan log ditemukan"}
              description={
                isErrors
                  ? "Sistem beroperasi optimal tanpa error runtime yang tidak tertangani."
                  : "Tidak ada event yang cocok dengan kriteria filter atau rentang tanggal yang dipilih."
              }
            />
          ) : isSecurity ? (
            /* ═══════════════════ SOC SECURITY FEED ═══════════════════ */
            <div className="space-y-3">
              {items.map((sec: SecurityLog) => {
                const meta = SECURITY_EVENT_CONFIG[sec.eventType] || DEFAULT_EVENT_META;
                const Icon = meta.icon;
                const isExpanded = expandedId === sec.id;
                const { browser, os } = parseUserAgent(sec.userAgent);

                return (
                  <Card
                    key={sec.id}
                    className={`border border-border bg-surface transition-all rounded-xl shadow-xs overflow-hidden border-l-4 ${meta.borderClass} ${
                      isExpanded ? "ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : sec.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                    >
                      {/* Kolom Kiri: Severity + Event Info */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-foreground">{meta.label}</span>
                            <Badge variant="outline" className={`text-[9px] font-black uppercase ${meta.badgeClass}`}>
                              {meta.severity}
                            </Badge>
                            {sec.path && (
                              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border text-foreground truncate max-w-[220px]">
                                {sec.path}
                              </code>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground font-medium line-clamp-1">
                            {sec.detail || "Event telemetri keamanan tercatat."}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px] text-muted-foreground">
                            {/* IP Badge */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(sec.ip, "Alamat IP");
                              }}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-foreground hover:text-primary transition-colors bg-surface-subtle px-1.5 py-0.5 rounded border border-border"
                              title="Klik untuk salin IP"
                            >
                              <Wifi className="w-3 h-3 text-muted-foreground" />
                              {sec.ip || "127.0.0.1"}
                              <Copy className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                            </button>

                            {/* Device & Client */}
                            <span className="inline-flex items-center gap-1">
                              <Laptop className="w-3 h-3" />
                              {browser} on {os}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Kolom Kanan: Timestamp & Chevron */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                        <div className="text-left md:text-right">
                          <p className="text-xs font-mono font-bold text-foreground">
                            {new Date(sec.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(sec.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Forensic Details Drawer */}
                    {isExpanded && (
                      <div className="px-5 py-4 border-t border-border bg-surface-subtle/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-primary" /> Rincian Forensik Insiden
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground">ID #{sec.id}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="p-2.5 bg-surface rounded-lg border border-border">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Client IP
                            </span>
                            <span className="font-mono font-bold text-foreground mt-0.5 block">{sec.ip}</span>
                          </div>
                          <div className="p-2.5 bg-surface rounded-lg border border-border">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Target Path
                            </span>
                            <span className="font-mono font-bold text-foreground mt-0.5 block truncate">
                              {sec.path || "—"}
                            </span>
                          </div>
                          <div className="p-2.5 bg-surface rounded-lg border border-border">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Severity Level
                            </span>
                            <span className="font-mono font-bold text-foreground mt-0.5 block">{meta.severity}</span>
                          </div>
                          <div className="p-2.5 bg-surface rounded-lg border border-border">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              ISO Timestamp
                            </span>
                            <span className="font-mono font-bold text-foreground mt-0.5 block truncate">
                              {sec.createdAt}
                            </span>
                          </div>
                        </div>

                        {sec.detail && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Pesan Detail / Telemetri
                            </span>
                            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-border overflow-x-auto">
                              {sec.detail}
                            </div>
                          </div>
                        )}

                        {sec.userAgent && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              Raw User-Agent Header
                            </span>
                            <p className="text-[11px] font-mono text-muted-foreground break-all bg-surface p-2 rounded-lg border border-border">
                              {sec.userAgent}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : isAudit ? (
            /* ═══════════════════ AUDIT TRAIL FEED ═══════════════════ */
            <div className="space-y-3">
              {items.map((item: AuditLog) => {
                const isExpanded = expandedId === item.id;

                return (
                  <Card
                    key={item.id}
                    className={`border border-border bg-surface transition-all rounded-xl shadow-xs overflow-hidden ${
                      isExpanded ? "ring-1 ring-primary/40" : ""
                    }`}
                  >
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                    >
                      {/* Kiri: Aksi + Tabel + User */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <Badge
                          variant={ACTION_VARIANT[item.action] || "secondary"}
                          className="mt-0.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 shrink-0"
                        >
                          {item.action}
                        </Badge>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                              <Database className="w-3.5 h-3.5 text-primary" />
                              {item.tableName}
                            </span>
                            {item.recordId ? (
                              <span className="text-xs font-mono font-bold text-muted-foreground">
                                #{item.recordId}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-foreground font-semibold">
                              Oleh: <strong className="text-primary">{item.user?.nama || "Sistem"}</strong>
                            </span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-surface-subtle border border-border text-muted-foreground">
                              {item.user?.role || "SYSTEM"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Kanan: Timestamp */}
                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                        <div className="text-left md:text-right">
                          <p className="text-xs font-mono font-bold text-foreground">
                            {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Diff Inspector */}
                    {isExpanded && (
                      <div className="px-5 py-4 border-t border-border bg-surface-subtle/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FileCode className="w-3.5 h-3.5 text-primary" /> Visual State Diff
                          </h4>
                          <span className="text-[10px] font-mono text-muted-foreground">Log ID #{item.id}</span>
                        </div>

                        <div className="bg-surface rounded-xl p-3 border border-border shadow-xs">
                          {formatChanges(item)}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ═══════════════════ ERROR LOG FEED ═══════════════════ */
            <div className="space-y-3">
              {items.map((log: ErrorLog) => {
                const expanded = expandedId === log.id;
                return (
                  <Card
                    key={log.id}
                    className={`border border-border bg-surface transition-all rounded-xl shadow-xs overflow-hidden border-l-4 border-l-rose-500 ${
                      expanded ? "ring-1 ring-rose-500/40" : ""
                    }`}
                  >
                    <div
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-3 cursor-pointer hover:bg-surface-subtle/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border bg-rose-500/10 text-rose-500 border-rose-500/30">
                          <Bug className="w-4 h-4" />
                        </span>

                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 break-all leading-snug">
                            {log.message}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1">
                            {log.path && (
                              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle border border-border">
                                {log.path}
                              </code>
                            )}
                            {log.userEmail && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                <UserIcon className="w-3 h-3" /> {log.userEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                        <div className="text-left md:text-right">
                          <p className="text-xs font-mono font-bold text-foreground">
                            {new Date(log.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0">
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Stack Trace Terminal */}
                    {expanded && (
                      <div className="px-5 py-4 border-t border-border bg-surface-subtle/70 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-rose-500" /> Stack Trace
                          </span>
                          <div className="flex items-center gap-2">
                            {log.stack && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyText(log.stack || "", "Stack trace")}
                                className="h-7 text-xs rounded-lg gap-1.5 shadow-xs"
                              >
                                <Copy className="w-3 h-3" /> Salin Stack
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm("Hapus log error ini?")) deleteErrorMutation.mutate(log.id);
                              }}
                              disabled={deleteErrorMutation.isPending}
                              className="h-7 text-xs rounded-lg gap-1.5 shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </Button>
                          </div>
                        </div>

                        {log.stack ? (
                          <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[320px] overflow-y-auto whitespace-pre border border-border/60">
                            {log.stack}
                          </pre>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">Tidak ada stack trace terekam.</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── PAGINATION BAR ── */}
          {!isErrors && totalPages > 1 && (
            <div className="pt-6">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                limit={PAGE_SIZE}
                onPageChange={(p) => setPage(p)}
                className="rounded-xl border shadow-xs"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
