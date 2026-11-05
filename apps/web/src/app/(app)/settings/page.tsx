"use client";

import { ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { MasterCrud } from "@/components/master-crud";
import { EmptyState } from "@/components/ui/empty-state";

export default function SettingsPuskesmasPage() {
  const { data: session } = useSession();

  if ((session?.user as any)?.role !== "ADMIN") {
    return (
      <div className="py-12">
        <EmptyState
          icon={<ShieldAlert className="w-8 h-8 text-destructive" aria-hidden="true" />}
          title="Akses Ditolak"
          description="Hanya administrator yang dapat mengelola pengaturan sistem."
        />
      </div>
    );
  }

  return <MasterCrud title="Master Puskesmas" apiUrl="/api/master/puskesmas" />;
}
