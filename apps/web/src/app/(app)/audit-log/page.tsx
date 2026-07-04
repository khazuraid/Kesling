"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
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
  X,
} from "lucide-react";
import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: number;
  action: string;
  tableName: string;
  recordId: number | null;
  changes: any;
  userId: number;
  user: { id: number; nama: string; email: string; role: string };
  createdAt: string;
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
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 border-[hsl(var(--success))]/20",
  UPDATE: "text-[hsl(var(--info))] bg-[hsl(var(--info))]/10 border-[hsl(var(--info))]/20",
  DELETE: "text-[hsl(var(--error))] bg-[hsl(var(--error))]/10 border-[hsl(var(--error))]/20",
};
const SECURITY_STYLES: Record<string, string> = {
  LOGIN_FAILED: "text-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 border-[hsl(var(--warning))]/20",
  RATE_LIMIT: "text-[hsl(var(--info))] bg-[hsl(var(--info))]/10 border-[hsl(var(--info))]/20",
  BRUTE_FORCE: "text-[hsl(var(--error))] bg-[hsl(var(--error))]/10 border-[hsl(var(--error))]/20",
  SUSPICIOUS: "text-[hsl(var(--error))] bg-[hsl(var(--error))]/10 border-[hsl(var(--error))]/20",
};

const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const [tab, setTab] = useState<"audit" | "security">("audit");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Audit log query
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

  // Security log query
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

  const isAudit = tab === "audit";
  const data = isAudit ? auditData : securityData;
  const isLoading = isAudit ? auditLoading : securityLoading;
  const items: any[] = data?.data || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  function handleExport() {
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
    try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; }
  }

  function formatChanges(item: any) {
    const oldData = parseJson(item?.oldData);
    const newData = parseJson(item?.newData);

    if (item?.action === "UPDATE") {
      const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
      const changed = allKeys.filter((k) => JSON.stringify((oldData || {})[k]) !== JSON.stringify((newData || {})[k]));
      if (changed.length === 0) return <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Tidak ada perubahan tercatat</span>;
      return (
        <div className="space-y-2">
          {changed.map((k) => (
            <div key={k}>
              <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider block mb-0.5">{k}</span>
              <div className="flex gap-2 items-center text-[11px] font-mono">
                <span className="text-red-500 line-through">{(oldData || {})[k] !== undefined ? String((oldData || {})[k]) : "—"}</span>
                <span className="text-[hsl(var(--muted-foreground))]">→</span>
                <span className="text-green-600">{(newData || {})[k] !== undefined ? String((newData || {})[k]) : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const data = item?.action === "DELETE" ? oldData : newData;
    if (!data || Object.keys(data).length === 0) return <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Tidak ada detail</span>;
    return (
      <div className="space-y-0.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex gap-2 text-[11px]">
            <span className="text-[hsl(var(--muted-foreground))] min-w-[120px] shrink-0">{k}:</span>
            <span className="font-mono break-all">{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full mx-auto pb-4 space-y-4 fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <h1 className="text-[16px] font-bold text-[hsl(var(--foreground))]">Audit Log</h1>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Riwayat aktivitas & keamanan sistem</p>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="flex items-center gap-0.5 border-b border-[hsl(var(--border))]">
        <button
          onClick={() => {
            setTab("audit");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${
            tab === "audit"
              ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Aktivitas
        </button>
        <button
          onClick={() => {
            setTab("security");
            setPage(1);
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold border-b-2 transition-colors ${
            tab === "security"
              ? "border-[hsl(var(--accent))] text-[hsl(var(--accent))]"
              : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Keamanan
        </button>
      </div>

      {/* TOOLBAR */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {isAudit ? (
            <>
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari user, tabel, atau aksi..."
                  className="w-full h-9 pl-9 pr-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[12px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
                />
              </div>
              <div className="flex items-center gap-1">
                {["all", "CREATE", "UPDATE", "DELETE"].map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setActionFilter(a);
                      setPage(1);
                    }}
                    className={cn(
                      "h-9 px-3 text-[10px] font-bold uppercase tracking-wider border transition-colors",
                      actionFilter === a
                        ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]"
                        : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--foreground))]/30",
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "h-9 w-9 flex items-center justify-center border transition-colors",
                showFilters
                  ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] border-[hsl(var(--foreground))]"
                  : "bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] border-[hsl(var(--border))]",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? "Matikan auto-refresh" : "Nyalakan auto-refresh"}
              className="h-9 px-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center gap-1 text-[10px] font-bold"
            >
              {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={handleExport}
              className="h-9 px-2.5 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center gap-1 text-[10px] font-bold"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 p-3 border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Dari
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Sampai
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="h-8 px-2 bg-[hsl(var(--background))] border border-[hsl(var(--border))] text-[11px] font-medium text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--accent))] transition-colors"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setPage(1);
                }}
                className="h-8 px-2 text-[10px] font-bold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {/* Header */}
        <div className="flex items-center px-4 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
          {isAudit ? (
            <>
              <div className="w-[80px] text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Aksi
              </div>
              <div className="w-[140px] text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Tabel
              </div>
              <div className="flex-1 text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                User
              </div>
              <div className="w-[160px] text-right text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Waktu
              </div>
            </>
          ) : (
            <>
              <div className="w-[100px] text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Event
              </div>
              <div className="w-[140px] text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                IP
              </div>
              <div className="flex-1 text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Detail
              </div>
              <div className="w-[160px] text-right text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                Waktu
              </div>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[hsl(var(--border))] border-t-[hsl(var(--accent))] animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            {isAudit ? (
              <Activity className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
            ) : (
              <Shield className="w-8 h-8 text-[hsl(var(--muted-foreground))] opacity-30" />
            )}
            <p className="text-[13px] font-bold text-[hsl(var(--foreground))]">Tidak ada data</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Coba ubah filter</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
            {items.map((item: any) => {
              const isExpanded = expandedId === item.id;
              return (
                <Fragment key={item.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex items-center px-4 py-2.5 border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--muted))]/30 transition-colors cursor-pointer"
                  >
                    {isAudit ? (
                      <>
                        <div className="w-[80px]">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                              ACTION_STYLES[item.action] ||
                                "text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] border-[hsl(var(--border))]",
                            )}
                          >
                            {item.action}
                          </span>
                        </div>
                        <div className="w-[140px] flex items-center gap-1.5">
                          <Database className="w-3 h-3 text-[hsl(var(--muted-foreground))] shrink-0" />
                          <span className="text-[11px] font-bold text-[hsl(var(--foreground))] truncate">
                            {item.tableName}
                          </span>
                          {item.recordId && (
                            <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] tabular-nums">
                              #{item.recordId}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 bg-[hsl(var(--muted))] border border-[hsl(var(--border))] flex items-center justify-center text-[9px] font-bold text-[hsl(var(--foreground))] shrink-0">
                            {item.user?.nama?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[hsl(var(--foreground))] truncate">
                              {item.user?.nama}
                            </p>
                            <p className="text-[8px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                              {item.user?.role}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-[100px]">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border",
                              SECURITY_STYLES[item.eventType] ||
                                "text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] border-[hsl(var(--border))]",
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
                    <div className="px-4 py-3 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/20">
                      {isAudit ? (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                              Detail Perubahan
                            </span>
                            <span className="text-[9px] font-medium text-[hsl(var(--muted-foreground))]">
                              {item.tableName} • {item.user?.nama} • {new Date(item.createdAt).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="mt-1 bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3 overflow-x-auto max-h-[300px] overflow-y-auto">
                            {formatChanges(item)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--warning))]" />
                            <span className="text-[9px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
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
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            {total} entri • Hal {page} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + Math.max(1, page - 2);
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold transition-colors ${p === page ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
