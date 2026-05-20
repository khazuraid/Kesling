"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          📜 Riwayat
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riwayat Perubahan</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="text-slate-400 text-sm">Belum ada perubahan tercatat</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="border-b pb-2 text-sm">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{log.user.nama}</span>
                  <span>{new Date(log.createdAt).toLocaleString("id-ID")}</span>
                </div>
                <div>
                  <span className="font-medium">{log.field}</span>:{" "}
                  <span className="text-red-500 line-through">{log.oldValue || "-"}</span>
                  {" → "}
                  <span className="text-green-600">{log.newValue || "-"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
