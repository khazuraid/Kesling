"use client";

import { useQuery } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { useState } from "react";

interface ChangelogEntry {
  id: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { nama: string };
}

interface Props {
  tableName: string;
  recordId: number;
}

const FIELD_LABELS: Record<string, string> = {
  status: "Status Laporan",
  nilai: "Nilai Parameter",
  target: "Target Kinerja",
  nama: "Nama",
  email: "Email",
  role: "Hak Akses",
  puskesmasId: "Penugasan Puskesmas",
  bulan: "Bulan",
  tahun: "Tahun",
  formula: "Formula Kalkulasi",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins}m lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}j lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}h lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID");
}

export function ChangelogButton({ tableName, recordId }: Props) {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading } = useQuery<ChangelogEntry[]>({
    queryKey: ["changelog", tableName, recordId],
    queryFn: async () => {
      const res = await fetch(`/api/changelog?table=${tableName}&recordId=${recordId}`);
      return res.json();
    },
    enabled: open,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center transition-colors"
      >
        <History className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-zinc-950 tracking-tight">Riwayat Perubahan</h3>
                <p className="text-[12px] text-zinc-500 mt-1 font-medium">Log aktivitas perubahan data</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-zinc-400">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[13px] font-medium">Memuat riwayat...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-8 text-center text-zinc-400">
                <History className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-[13px] font-medium">Belum ada perubahan tercatat</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {FIELD_LABELS[log.field] || log.field}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-medium">{timeAgo(log.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 font-semibold border border-rose-200">
                        {log.oldValue || "—"}
                      </span>
                      <span className="text-zinc-300">→</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 font-semibold border border-emerald-200">
                        {log.newValue || "—"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1.5 font-medium">oleh {log.user.nama}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="h-9 px-4 bg-transparent border border-[hsl(var(--border))] text-[hsl(var(--foreground))] text-[11px] font-bold uppercase tracking-wider hover:bg-[hsl(var(--muted))] transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
