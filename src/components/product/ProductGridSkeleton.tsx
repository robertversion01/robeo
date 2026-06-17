export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-1.5 md:gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-lg overflow-hidden border border-border bg-card/50">
          {/* Image skeleton */}
          <div className="aspect-[3/4] sm:aspect-[4/5] bg-[#0f1a1d]/40 animate-pulse" style={{ contentVisibility: 'auto' }} />
          
          {/* Content skeleton */}
          <div className="p-1.5 space-y-1.5">
            <div className="h-3 w-1/3 bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
