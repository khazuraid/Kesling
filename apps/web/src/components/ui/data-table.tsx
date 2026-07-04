"use client";

import { cn } from "@/lib/utils";

/* ── Modern Data Table ──────────────────────────────────────────────── */

interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  width?: string;
  render?: (row: T, idx: number) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
  compact?: boolean;
  className?: string;
  rowKey?: (row: T, idx: number) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "Tidak ada data",
  stickyHeader = false,
  compact = false,
  className,
  rowKey,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-sm)] text-[hsl(var(--muted-foreground))] font-medium">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr
            className={cn(
              "border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30",
              stickyHeader && "sticky top-0 bg-[hsl(var(--card))] z-10",
            )}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 font-bold uppercase tracking-wider text-[10px] text-[hsl(var(--muted-foreground))]",
                  col.align === "center" && "text-center",
                  col.align === "right" && "text-right",
                  !col.align && "text-left",
                  compact ? "py-2.5" : "py-3",
                )}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={rowKey ? rowKey(row, idx) : idx}
              className={cn(
                "border-b border-[hsl(var(--border))]/50 transition-colors",
                onRowClick && "cursor-pointer hover:bg-[hsl(var(--muted))]/50",
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 text-[hsl(var(--foreground))] text-[12px]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                    !col.align && "text-left",
                    compact ? "py-2" : "py-3",
                  )}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
