"use client";

import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";

interface AuditLog {
  id: number;
  createdAt: string;
  action: string;
  tableName: string;
  recordId: string;
  user?: { nama: string };
}

const columns: ColumnDef<AuditLog, any>[] = [
  {
    accessorKey: "createdAt",
    header: "Waktu",
    cell: ({ getValue }) => new Date(getValue()).toLocaleString("id-ID"),
  },
  {
    accessorFn: (row) => row.user?.nama ?? "-",
    id: "user",
    header: "User",
  },
  {
    accessorKey: "action",
    header: "Aksi",
    cell: ({ getValue }) => {
      const action = getValue() as string;
      const cls =
        action === "CREATE"
          ? "bg-green-100 text-green-700"
          : action === "DELETE"
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700";
      return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{action}</span>;
    },
  },
  { accessorKey: "tableName", header: "Tabel" },
  { accessorKey: "recordId", header: "ID" },
];

export default function AuditLogPage() {
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const res = await fetch("/api/audit-log");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>
      <DataTable columns={columns} data={logs} searchPlaceholder="Cari log..." />
    </div>
  );
}
