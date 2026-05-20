import { TableSkeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div>
      <div className="h-7 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
      <TableSkeleton rows={12} cols={7} />
    </div>
  );
}
