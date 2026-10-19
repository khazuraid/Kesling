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
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground font-medium">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("rounded-card border border-border bg-surface overflow-x-auto shadow-subtle", className)}>
      <table className="w-full border-collapse text-[13px] text-foreground">
        <thead>
          <tr
            className={cn(
              "border-b border-border bg-surface-subtle/80",
              stickyHeader && "sticky top-0 z-10 bg-surface-subtle backdrop-blur-xs",
            )}
          >
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 font-bold uppercase tracking-wider text-[10px] text-muted-foreground select-none",
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
                "border-b border-border/60 transition-colors last:border-b-0",
                onRowClick
                  ? "cursor-pointer hover:bg-surface-hover active:bg-surface-subtle"
                  : "hover:bg-surface-hover/40",
              )}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-4 text-[13px] text-foreground",
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
