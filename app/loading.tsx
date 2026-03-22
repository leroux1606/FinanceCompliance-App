export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
