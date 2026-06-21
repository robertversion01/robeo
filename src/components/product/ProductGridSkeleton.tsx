export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 sm:gap-1 lg:grid-cols-5 xl:grid-cols-6 lg:gap-1.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="overflow-hidden bg-transparent">
          <div
            className="aspect-[4/5] bg-[#0f1a1d]/40 animate-pulse"
            style={{ contentVisibility: 'auto' }}
          />
          <div className="pt-0.5 space-y-1">
            <div className="h-3.5 w-1/3 bg-[#1a2328] animate-pulse rounded-sm" />
            <div className="h-3 w-4/5 bg-[#1a2328] animate-pulse rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
