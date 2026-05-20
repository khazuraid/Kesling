"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [restoreLoading, setRestoreLoading] = useState(false);

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);

    const text = await file.text();
    const res = await fetch("/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: text,
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(data.message);
    } else {
      toast.error(data.error);
    }
    setRestoreLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Backup Database</h2>
          <p className="text-sm text-slate-500 mb-3">Download seluruh data dalam format JSON.</p>
          <Button asChild>
            <a href="/api/backup">📥 Download Backup</a>
          </Button>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Restore Database</h2>
          <p className="text-sm text-slate-500 mb-3">Upload file backup JSON untuk mengembalikan data.</p>
          <Input type="file" accept=".json" onChange={handleRestore} disabled={restoreLoading} className="max-w-xs" />
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Import Excel</h2>
          <p className="text-sm text-slate-500 mb-3">Import data dari file Excel.</p>
          <Button variant="outline" asChild>
            <a href="/settings/import">📤 Halaman Import</a>
          </Button>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Manage Users</h2>
          <p className="text-sm text-slate-500 mb-3">Kelola akun pengguna (admin & operator).</p>
          <Button variant="outline" asChild>
            <a href="/settings/users">👥 Kelola Users</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
