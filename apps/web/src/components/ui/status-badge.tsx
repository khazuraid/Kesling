"use client";

import { cn } from "@/lib/utils";

/* ── StatusBadge ────────────────────────────────────────────────── */

export type Status = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

const STATUS_MAP: Record<Status, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "badge-draft" },
  SUBMITTED: { label: "Diajukan", className: "badge-submitted" },
  APPROVED: { label: "Disetujui", className: "badge-approved" },
  REJECTED: { label: "Ditolak", className: "badge-rejected" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status as Status] ?? { label: status, className: "badge-neutral" };

  return <span className={cn(config.className, className)}>{config.label}</span>;
}
