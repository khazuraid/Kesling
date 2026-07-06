"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertOctagon, Calendar, Trash2, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function SystemErrorsPage() {
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["system-errors"],
    queryFn: async () => {
      const res = await fetch("/api/system-errors");
      if (!res.ok) throw new Error("Gagal memuat log error");
      return res.json();
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/system-errors", { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal membersihkan log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Semua log error berhasil dibersihkan");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal membersihkan log");
    },
  });

  const deleteOneMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/system-errors?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus log");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Log error berhasil dihapus");
      queryClient.invalidateQueries({ queryKey: ["system-errors"] });
      setSelectedLog(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus log");
    },
  });

  const logs = data?.logs || [];

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[hsl(var(--foreground))]">System Error Logs</h1>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Daftar bug, exception, dan crash yang terjadi di sistem.
          </p>
        </div>
        {logs.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin menghapus semua log error?")) {
                clearAllMutation.mutate();
              }
            }}
            disabled={clearAllMutation.isPending}
            className="h-8 text-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Bersihkan Semua Log
          </Button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-xs text-[hsl(var(--muted-foreground))]">
              Memuat log error...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[hsl(var(--border))] rounded-lg text-center p-6">
              <AlertOctagon className="w-8 h-8 text-[hsl(var(--muted-foreground))] mb-2 opacity-50" />
              <p className="text-sm font-medium text-[hsl(var(--foreground))]">Tidak Ada Error Terdeteksi</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Sistem berjalan dengan lancar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 border rounded-lg transition-all cursor-pointer flex flex-col gap-2 hover:bg-[hsl(var(--accent))] ${
                    selectedLog?.id === log.id
                      ? "border-[hsl(var(--foreground))] bg-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border))] bg-[hsl(var(--card))]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="font-mono text-xs font-semibold text-destructive break-all leading-normal">
                      {log.message}
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-destructive/10 text-destructive shrink-0">
                      {log.path || "API"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString("id-ID")}
                    </div>
                    {log.userEmail && (
                      <div className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {log.userEmail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Detail (Pannel Kanan) */}
        {selectedLog && (
          <div className="w-[450px] border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Detail Error Log</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Hapus log error ini?")) {
                    deleteOneMutation.mutate(selectedLog.id);
                  }
                }}
                disabled={deleteOneMutation.isPending}
                className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-[hsl(var(--muted-foreground))] block">Pesan Error:</span>
                <div className="p-3 bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded font-mono text-destructive break-all whitespace-pre-wrap">
                  {selectedLog.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-semibold text-[hsl(var(--muted-foreground))] block">Path/Konteks:</span>
                  <span className="font-mono bg-[hsl(var(--accent))] px-1.5 py-0.5 rounded text-[11px] block mt-1 overflow-x-auto">
                    {selectedLog.path || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-[hsl(var(--muted-foreground))] block">User:</span>
                  <span className="block mt-1 font-medium text-[hsl(var(--foreground))]">
                    {selectedLog.userEmail || "Anonymous (Tidak Login)"}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-[hsl(var(--muted-foreground))] block mb-1">Stack Trace:</span>
                {selectedLog.stack ? (
                  <pre className="p-3 bg-black text-green-400 font-mono rounded text-[10px] overflow-x-auto max-h-[300px] overflow-y-auto whitespace-pre leading-relaxed border border-zinc-800">
                    {selectedLog.stack}
                  </pre>
                ) : (
                  <span className="text-[hsl(var(--muted-foreground))] italic">Tidak ada stack trace terekam.</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
