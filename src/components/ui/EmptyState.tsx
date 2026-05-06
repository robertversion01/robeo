import Link from 'next/link';
import { Search, Heart, MessageSquare, Package, ShoppingBag } from 'lucide-react';

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
        <Link 
          href={actionHref} 
          className="px-6 py-2 bg-accent text-accent-foreground rounded-full font-medium hover:bg-accent/90 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}