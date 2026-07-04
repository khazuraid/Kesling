export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 bg-[hsl(var(--muted))]" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-[hsl(var(--muted))]" />
        ))}
      </div>
      <div className="h-64 w-full bg-[hsl(var(--muted))]" />
    </div>
  );
}
