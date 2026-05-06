import Link from 'next/link';
import { Search, Heart, MessageSquare, Package, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: 'search' | 'favorites' | 'messages' | 'products' | 'cart';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

const icons = {
  search: Search,
  favorites: Heart,
  messages: MessageSquare,
  products: Package,
  cart: ShoppingBag
};

export default function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
        <Icon size={36} className="text-accent" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      
      {actionLabel && actionHref && (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}