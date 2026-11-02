"use client";

import { Bell } from "lucide-react";
import { NotificationManager } from "@/components/notification-manager";

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground">Manajemen Notifikasi & Pengumuman</h1>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              Kirim siaran notifikasi langsung ke pengguna serta kelola pengumuman dan popup aplikasi
            </p>
          </div>
        </div>
      </div>

      <NotificationManager />
    </div>
  );
}
