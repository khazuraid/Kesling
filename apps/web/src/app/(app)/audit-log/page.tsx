"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bug,
  Calendar,
  ChevronDown,
  ChevronUp,
  Database,
  Download,
  Pause,
  Play,
  Shield,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangeInputs, FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

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

// ─── Tier meta ────────────────────────────────────────────────────────────────

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  CREATE: "success",
  UPDATE: "warning",
  DELETE: "destructive",
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
        return <span className="text-[11px] text-muted-foreground">Tidak ada perubahan tercatat</span>;
      return (
        <div className="space-y-2.5">
          {changed.map((k) => (
            <div key={k}>
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em] block mb-1">
                {k}
              </span>
              <div className="flex flex-wrap gap-2 items-center text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive line-through border border-destructive/20">
                  {oldData?.[k] !== undefined ? String(oldData?.[k]) : "—"}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
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
      return <span className="text-[11px] text-muted-foreground">Tidak ada detail</span>;
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px]">
            <span className="text-muted-foreground min-w-[120px] shrink-0">{k}:</span>
            <span className="font-mono break-all text-foreground">{String(v)}</span>
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
    <div className="w-full fade-in min-h-screen bg-canvas">
      {/* ── MASTHEAD FLUSH LANGSUNG KE NAVBAR ── */}
      <div className="w-full bg-surface border-b border-border px-6 sm:px-8 py-5 sm:py-6">
        <div className="w-full max-w-[1600px] mx-auto space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-primary mb-1.5 sm:mb-2">
                Sistem
              </p>
              <h1 className="text-[22px] sm:text-[28px] font-black tracking-tight leading-none text-foreground">
                Log & Pemantauan
              </h1>
              <p className="text-[12px] sm:text-[13px] font-medium text-muted-foreground mt-2">
                Riwayat aktivitas, keamanan, dan error sistem
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-1.5 rounded-full"
                title={autoRefresh ? "Matikan auto-refresh" : "Nyalakan auto-refresh"}
              >
                {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {autoRefresh ? "Live" : "Paused"}
              </Button>
              {isErrors ? (
                items.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm("Hapus semua log error?")) clearErrorsMutation.mutate();
                    }}
                    disabled={clearErrorsMutation.isPending}
                    className="gap-1.5 rounded-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Bersihkan
                  </Button>
                )
              ) : (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 rounded-full">
                  <Download className="w-3.5 h-3.5" /> CSV
                </Button>
              )}
            </div>
          </div>

          {/* Tabs — bottom edge masthead */}
          <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle border border-border p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                  setExpandedId(null);
                }}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  tab === t.key ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={`text-[10px] font-extrabold tabular-nums px-1.5 py-px rounded-full ${
                      tab === t.key ? "bg-white/20 text-white" : "bg-destructive/10 text-destructive"
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

      {/* ── CONTENT BODY (CANVAS) ── */}
      <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-8 py-6 space-y-6">
        {/* ── TOOLBAR ── */}
        {!isErrors && (
          <div className="pt-2">
            <FilterBar
              searchValue={search}
              onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
              placeholder={isAudit ? "Cari user, tabel, atau aksi..." : "Cari log keamanan..."}
              isFetching={isLoading}
              activeFilters={[
                ...(actionFilter !== "all"
                  ? [
                      {
                        key: "action",
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
                if (isAudit) setActionFilter("all");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              {isAudit && (
                <div className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-subtle">
                  {["all", "CREATE", "UPDATE", "DELETE"].map((a) => (
                    <Button
                      key={a}
                      type="button"
                      variant={actionFilter === a ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setActionFilter(a);
                        setPage(1);
                      }}
                      className="h-8 px-3 text-[10px] font-extrabold uppercase tracking-wider rounded-lg"
                    >
                      {a === "all" ? "Semua" : a}
                    </Button>
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

        {/* ── LIST ── */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-primary animate-spin rounded-full" />
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
                  <Card
                    key={log.id}
                    className={cn(
                      "overflow-hidden transition-colors shadow-subtle",
                      expanded ? "border-destructive/50" : "border-border",
                    )}
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : log.id)}
                      className="w-full flex items-start gap-4 px-5 py-4 text-left hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                    >
                      <span className="mt-1 w-2 h-2 rounded-full shrink-0 bg-destructive" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold font-mono text-destructive leading-snug break-all">
                          {log.message}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[10px] font-semibold text-muted-foreground">
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
                      <Badge variant="destructive" className="shrink-0 text-[10px] uppercase font-bold tracking-wider">
                        {log.path || "API"}
                      </Badge>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 shrink-0 text-muted-foreground transition-transform mt-1",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>

                    {expanded && (
                      <div className="px-5 pb-5 pt-4 space-y-4 border-t border-border">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                            Pesan Error
                          </p>
                          <div className="px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 font-mono text-[12px] text-destructive break-all whitespace-pre-wrap">
                            {log.message}
                          </div>
                        </div>
                        {log.stack ? (
                          <div>
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                              Stack Trace
                            </p>
                            <pre className="px-4 py-3 rounded-xl bg-slate-950 text-emerald-400 border border-border/40 font-mono text-[10px] overflow-x-auto max-h-[280px] overflow-y-auto whitespace-pre leading-relaxed">
                              {log.stack}
                            </pre>
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-muted-foreground">Tidak ada stack trace terekam.</p>
                        )}
                        <div className="flex justify-end">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Hapus log error ini?")) deleteErrorMutation.mutate(log.id);
                            }}
                            disabled={deleteErrorMutation.isPending}
                            className="gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus Log
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            /* ── AUDIT / SECURITY TABLE ── */
            <Card className="shadow-subtle overflow-hidden">
              <div className="overflow-x-auto">
                {/* Header */}
                <div className="flex items-center px-5 py-3 border-b border-border bg-surface-subtle min-w-[720px]">
                  {isAudit ? (
                    <>
                      <div className="w-[90px] truncate text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Aksi
                      </div>
                      <div className="w-[150px] truncate text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Tabel
                      </div>
                      <div className="flex-1 truncate text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        User
                      </div>
                      <div className="w-[160px] truncate text-right text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Waktu
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-[110px] shrink-0 text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Event
                      </div>
                      <div className="w-[200px] shrink-0 text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        IP
                      </div>
                      <div className="flex-1 min-w-0 text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Detail
                      </div>
                      <div className="w-[160px] shrink-0 text-right text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                        Waktu
                      </div>
                    </>
                  )}
                </div>

                <div className="max-h-[600px] overflow-y-auto divide-y divide-border/60 min-w-[720px]">
                  {items.map((item: any) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <Fragment key={item.id}>
                        <div
                          onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          className="flex items-center px-5 py-3 hover:bg-surface-subtle/50 transition-colors cursor-pointer"
                        >
                          {isAudit ? (
                            <>
                              <div className="w-[90px]">
                                <Badge
                                  variant={ACTION_VARIANT[item.action] || "secondary"}
                                  className="text-[10px] uppercase font-bold"
                                >
                                  {item.action}
                                </Badge>
                              </div>
                              <div className="w-[150px] flex items-center gap-1.5">
                                <Database className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-[11px] font-bold text-foreground truncate">{item.tableName}</span>
                                {item.recordId ? (
                                  <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                    #{item.recordId}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-md bg-primary-subtle text-primary flex items-center justify-center text-[11px] font-extrabold shrink-0">
                                  {item.user?.nama?.charAt(0) || "U"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-foreground truncate">{item.user?.nama}</p>
                                  <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
                                    {item.user?.role}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-[110px] shrink-0">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                  {item.eventType.replace("_", " ")}
                                </Badge>
                              </div>
                              <div className="w-[200px] shrink-0">
                                <span
                                  className="block text-[11px] font-bold text-foreground font-mono truncate"
                                  title={item.ip || "—"}
                                >
                                  {item.ip || "—"}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground truncate">
                                  {item.detail || item.path || "—"}
                                </p>
                              </div>
                            </>
                          )}
                          <div className="w-[160px] shrink-0 flex items-center justify-end gap-2">
                            <div className="text-right">
                              <p className="text-[11px] font-medium text-foreground tabular-nums">
                                {new Date(item.createdAt).toLocaleDateString("id-ID", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                              <p className="text-[11px] font-bold text-muted-foreground tabular-nums">
                                {new Date(item.createdAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-5 py-4 bg-surface-subtle/50">
                            {isAudit ? (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                                    Detail Perubahan
                                  </span>
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    {item.tableName} • {item.user?.nama} •{" "}
                                    {new Date(item.createdAt).toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <Card className="p-3.5 overflow-x-auto max-h-[300px] overflow-y-auto">
                                  {formatChanges(item)}
                                </Card>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.15em]">
                                    Detail Event
                                  </span>
                                </div>
                                <div className="space-y-1.5 text-[11px] font-medium text-foreground">
                                  <p>
                                    <span className="text-muted-foreground">IP:</span> {item.ip}
                                  </p>
                                  {item.path && (
                                    <p>
                                      <span className="text-muted-foreground">Path:</span> {item.path}
                                    </p>
                                  )}
                                  {item.userAgent && (
                                    <p>
                                      <span className="text-muted-foreground">User Agent:</span>{" "}
                                      <span className="text-[10px]">{item.userAgent}</span>
                                    </p>
                                  )}
                                  {item.detail && (
                                    <p>
                                      <span className="text-muted-foreground">Detail:</span> {item.detail}
                                    </p>
                                  )}
                                  <p>
                                    <span className="text-muted-foreground">Waktu:</span>{" "}
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
            </Card>
          )}
        </div>

        {/* ── PAGINATION ── */}
        {!isErrors && (
          <Card className="shadow-subtle overflow-hidden">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onPageChange={setPage}
              isFetching={isLoading}
              noun="entri"
              className="border-t-0"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
