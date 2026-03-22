export default function CompaniesLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded bg-slate-200" />
        <div className="h-10 w-36 rounded-lg bg-slate-200" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-200" />
      ))}
    </div>
  );
}
