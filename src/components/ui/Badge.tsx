import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'verified' | 'featured' | 'accent';

type Props = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClass: Record<BadgeVariant, string> = {
  default: 'border-[#2a3941] bg-[#1a2328] text-[#b2c0c6]',
  verified: 'border-[#38c7d0]/35 bg-[#17343a] text-[#9be2e8] font-semibold',
  featured: 'border-[#007782]/40 bg-[#007782] text-white font-bold uppercase tracking-wide',
  accent: 'border-amber-900/45 bg-amber-950/50 text-amber-300 font-medium',
};

export default function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-xs',
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
