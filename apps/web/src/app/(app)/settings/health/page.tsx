"use client";

import { ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { SystemHealthDashboard } from "@/components/system-health-dashboard";
import { EmptyState } from "@/components/ui/empty-state";

export default function SettingsHealthPage() {
  const { data: session } = useSession();

  if ((session?.user as any)?.role !== "ADMIN") {
    return (
      <div className="py-12">
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8 text-destructive" aria-hidden="true" />}
          title="Akses Ditolak"
          description="Hanya administrator yang dapat melihat status sistem."
        />
      </div>
    );
  }

  return <SystemHealthDashboard />;
}
