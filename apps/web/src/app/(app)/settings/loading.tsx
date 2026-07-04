export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-[hsl(var(--muted))]" />
      <div className="h-64 w-full bg-[hsl(var(--muted))]" />
    </div>
  );
}
