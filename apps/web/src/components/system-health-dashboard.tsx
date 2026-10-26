"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  Pause,
  Play,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

export interface HealthData {
  ok: boolean;
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  totalLatencyMs: number;
  database: {
    status: "up" | "down";
    latencyMs: number;
    activeConnections: number;
    databaseSizeBytes: number;
    counts: {
      users: number;
      sasaran: number;
      inspections: number;
      auditLogs: number;
      errors24h: number;
    };
  };
  redis: {
    status: "up" | "down";
    latencyMs: number;
    usedMemoryBytes: number;
    usedMemoryHuman: string;
    connectedClients: number;
    importQueueLength: number;
  };
  storage: {
    uploadsWritable: boolean;
    totalFiles: number;
    totalBytes: number;
  };
  runtime: {
    nodeVersion: string;
    processUptimeSec: number;
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    externalMb: number;
  };
  host: {
    platform: string;
    hostUptimeSec: number;
    cpuCores: number;
    cpuModel: string;
    loadAvg: {
      "1m": number;
      "5m": number;
      "15m": number;
    };
    memory: {
      totalMb: number;
      usedMb: number;
      freeMb: number;
      usedPercent: number;
    };
  };
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return `${h}j ${remM}m`;
  const d = Math.floor(h / 24);
  return `${d}h ${h % 24}j`;
}

export function SystemHealthDashboard() {
  const [intervalMs, setIntervalMs] = useState<number>(3000); // 3s default
  const [isLive, setIsLive] = useState<boolean>(true);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);

  const { data, isLoading, isFetching, refetch } = useQuery<HealthData>({
    queryKey: ["admin-system-health-live"],
    queryFn: async () => {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("Gagal memeriksa status sistem");
      return res.json();
    },
    refetchInterval: isLive ? intervalMs : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (data?.totalLatencyMs !== undefined) {
      setLatencyHistory((prev) => [...prev.slice(-19), data.totalLatencyMs]);
    }
  }, [data?.totalLatencyMs, data?.timestamp]);

  const maxLatency = Math.max(...latencyHistory, 100);

  return (
    <div className="space-y-5 fade-in">
      {/* ── TOP CONTROLS & LIVE STATUS ── */}
      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            {isLive ? (
              <>
                <span className="absolute w-4 h-4 rounded-full bg-[#00A876] opacity-75 animate-ping" />
                <span className="w-3 h-3 rounded-full bg-[#00A876]" />
              </>
            ) : (
              <span className="w-3 h-3 rounded-full bg-zinc-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-black text-[hsl(var(--foreground))]">
                {isLive ? "REALTIME MONITORING" : "MONITORING DIJEDA"}
              </h2>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  data?.status === "healthy"
                    ? "bg-[#00A876]/10 text-[#00A876] border border-[#00A876]/20"
                    : data?.status === "degraded"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                }`}
              >
                {data?.status || "memeriksa..."}
              </span>
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">
              Pembaruan data setiap {intervalMs / 1000}s · Total latency {data?.totalLatencyMs ?? "—"}ms
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Interval selector */}
          <div className="inline-flex items-center rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-1">
            {[1000, 3000, 5000].map((ms) => (
              <button
                key={ms}
                onClick={() => setIntervalMs(ms)}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold transition ${
                  intervalMs === ms
                    ? "bg-primary text-white shadow-subtle"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[11px] font-extrabold transition ${
              isLive ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" : "bg-[#00A876] text-white"
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isLive ? "Jeda" : "Mulai"}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition"
            title="Refresh manual"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-[#00A876]" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── LATENCY HISTORY SPARKBARS ── */}
      {latencyHistory.length > 0 && (
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Latency Timeline ({latencyHistory.length} ticks)
            </span>
            <span className="text-[11px] font-mono font-bold text-[hsl(var(--foreground))]">
              Terakhir: {data?.totalLatencyMs}ms (Puncak: {maxLatency}ms)
            </span>
          </div>
          <div className="h-10 flex items-end gap-1.5 pt-2">
            {latencyHistory.map((val, idx) => {
              const pct = Math.max(12, Math.min(100, (val / maxLatency) * 100));
              const color = val < 50 ? "#00A876" : val < 150 ? "#E8A33D" : "#E15A4F";
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    style={{ height: `${pct}%`, backgroundColor: color }}
                    className="w-full rounded-sm transition-all duration-300"
                  />
                  <div className="absolute -top-6 hidden group-hover:block bg-slate-900 text-white text-[11px] font-mono px-1.5 py-0.5 rounded shadow z-10 whitespace-nowrap border border-border/40">
                    {val}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 4 PRIMARY TILES ── */}
      {isLoading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-[hsl(var(--muted))]/40 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. DATABASE */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#00A876]" />
                <span className="text-[12px] font-extrabold">PostgreSQL</span>
              </div>
              {data.database.status === "up" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00A876] bg-[#00A876]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> UP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" /> DOWN
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Ping Latency:</span>
                <span className="font-mono font-bold text-[#00A876]">{data.database.latencyMs} ms</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Active Connections:</span>
                <span className="font-mono font-bold">{data.database.activeConnections}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Database Size:</span>
                <span className="font-mono font-bold">{formatBytes(data.database.databaseSizeBytes)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Error Log (24h):</span>
                <span
                  className={`font-mono font-bold ${data.database.counts.errors24h > 0 ? "text-amber-500" : "text-[#00A876]"}`}
                >
                  {data.database.counts.errors24h}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))] flex justify-between">
              <span>{data.database.counts.inspections} IKL</span>
              <span>{data.database.counts.sasaran} Sasaran</span>
              <span>{data.database.counts.users} User</span>
            </div>
          </div>

          {/* 2. REDIS & WORKER */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#7CF5CE]" />
                <span className="text-[12px] font-extrabold">Redis & Worker</span>
              </div>
              {data.redis.status === "up" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00A876] bg-[#00A876]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> UP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" /> DOWN
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Ping Latency:</span>
                <span className="font-mono font-bold text-[#00A876]">{data.redis.latencyMs} ms</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Used Memory:</span>
                <span className="font-mono font-bold">{data.redis.usedMemoryHuman}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Clients Connected:</span>
                <span className="font-mono font-bold">{data.redis.connectedClients}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Import Queue:</span>
                <span
                  className={`font-mono font-bold ${data.redis.importQueueLength > 0 ? "text-[#E8A33D]" : "text-[#00A876]"}`}
                >
                  {data.redis.importQueueLength >= 0 ? `${data.redis.importQueueLength} job` : "OFF"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))]">
              Queue engine: opendataloader-pdf
            </div>
          </div>

          {/* 3. STORAGE & VOLUME */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-[12px] font-extrabold">Volume Uploads</span>
              </div>
              {data.storage.uploadsWritable ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00A876] bg-[#00A876]/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> WRITABLE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> RO / GAGAL
                </span>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Total Berkas:</span>
                <span className="font-mono font-bold">{data.storage.totalFiles} file</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Kapasitas Terpakai:</span>
                <span className="font-mono font-bold text-[#00A876]">{formatBytes(data.storage.totalBytes)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Path Volume:</span>
                <span className="font-mono text-[10px] truncate max-w-[120px]">public/uploads</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Status Akses:</span>
                <span className="font-mono font-bold text-[#00A876]">R/W OK</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))]">
              Media foto pemeriksaan & TTD
            </div>
          </div>

          {/* 4. HOST & RUNTIME */}
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-[12px] font-extrabold">Host & Runtime</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[hsl(var(--muted-foreground))]">
                {data.runtime.nodeVersion}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Host RAM Used:</span>
                <span className="font-mono font-bold">
                  {data.host.memory.usedPercent}% ({data.host.memory.usedMb}MB)
                </span>
              </div>
              {/* RAM bar */}
              <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${data.host.memory.usedPercent}%`,
                    backgroundColor: data.host.memory.usedPercent > 85 ? "#E15A4F" : "#00A876",
                  }}
                />
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Load Avg (1m/5m):</span>
                <span className="font-mono font-bold">
                  {data.host.loadAvg["1m"]} / {data.host.loadAvg["5m"]}
                </span>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-[hsl(var(--muted-foreground))]">Node Heap / RSS:</span>
                <span className="font-mono font-bold">
                  {data.runtime.heapUsedMb}M / {data.runtime.rssMb}M
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))] flex justify-between">
              <span>Up: {formatDuration(data.runtime.processUptimeSec)}</span>
              <span>{data.host.cpuCores} CPU Core</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
