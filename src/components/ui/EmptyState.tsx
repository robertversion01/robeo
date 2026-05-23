import Link from 'next/link';
import { Search, Heart, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: 'search' | 'favorites' | 'messages' | 'products' | 'cart';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  dark?: boolean;
}

const icons = {
  search: Search,
  favorites: Heart,
  messages: MessageSquare,
  products: Package,
  cart: ShoppingBag,
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  dark = false,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div
        className={cn(
          'mb-6 flex h-20 w-20 items-center justify-center rounded-full',
          dark ? 'bg-white/10' : 'bg-accent/10',
        )}
      >
        <Icon size={36} className={dark ? 'text-[#007782]' : 'text-accent'} />
      </div>

      <h3 className={cn('mb-2 text-xl font-semibold', dark && 'text-white')}>{title}</h3>
      <p className={cn('mb-6 max-w-sm', dark ? 'text-gray-400' : 'text-muted-foreground')}>
        {description}
      </p>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="px-6 py-2 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/90 transition-colors"
        >
          {actionLabel}
        </button>
      ) : null}

      {actionLabel && actionHref && !onAction ? (
        <Link
          href={actionHref}
          className="px-6 py-2 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/90 transition-colors"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
