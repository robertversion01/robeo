export default function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-border bg-card/50">
          {/* Image skeleton */}
          <div className="aspect-square bg-muted animate-pulse" />
          
          {/* Content skeleton */}
          <div className="p-4 space-y-3">
            <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
            <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
            <div className="h-6 w-1/2 bg-muted animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}