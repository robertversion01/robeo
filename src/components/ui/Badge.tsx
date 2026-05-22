import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'verified' | 'featured' | 'accent';

type Props = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClass: Record<BadgeVariant, string> = {
  default: 'border-gray-200 bg-white text-gray-700',
  verified: 'border-[#007782]/30 bg-[#007782]/10 text-[#007782] font-semibold',
  featured: 'border-[#007782]/40 bg-[#007782] text-white font-bold uppercase tracking-wide',
  accent: 'border-amber-200/80 bg-amber-50 text-amber-900 font-medium',
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
