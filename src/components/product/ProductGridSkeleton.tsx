import { cn } from '@/lib/utils';

type Props = {
  dark?: boolean;
};

export default function ProductGridSkeleton({ dark = false }: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6 lg:gap-3',
        dark && 'max-md:gap-1',
      )}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'overflow-hidden rounded-lg',
            dark
              ? 'max-md:rounded-md max-md:bg-transparent md:border md:border-border md:bg-card/50'
              : 'border border-border bg-card/50',
          )}
        >
          <div
            className={cn(
              'aspect-[3/4] animate-pulse sm:aspect-[4/5]',
              dark ? 'max-md:bg-[#1c1c1e] md:bg-muted' : 'bg-muted',
            )}
          />
          <div className={cn('space-y-1.5 p-1.5', dark && 'max-md:px-0.5 max-md:pt-1.5')}>
            <div
              className={cn(
                'h-3 w-1/3 animate-pulse rounded',
                dark ? 'max-md:bg-white/10 md:bg-muted' : 'bg-muted',
              )}
            />
            <div
              className={cn(
                'h-4 w-3/4 animate-pulse rounded',
                dark ? 'max-md:bg-white/10 md:bg-muted' : 'bg-muted',
              )}
            />
            <div
              className={cn(
                'h-3 w-1/2 animate-pulse rounded',
                dark ? 'max-md:bg-[#007782]/20 md:bg-muted' : 'bg-muted',
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
