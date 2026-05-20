import {
  Bell,
  Heart,
  MessageCircle,
  Package,
  Search,
  Tag,
  TrendingDown,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { AppNotificationRow } from '@/lib/appNotificationsFeed';

export type NotificationVisual = {
  Icon: LucideIcon;
  accentClass: string;
};

export function getNotificationVisual(row: AppNotificationRow): NotificationVisual {
  const type = (row.type || '').toLowerCase();
  const title = (row.title || '').toLowerCase();

  if (type.includes('saved_search') || title.includes('mentett keresés')) {
    return { Icon: Search, accentClass: 'text-violet-600 bg-violet-50' };
  }
  if (type.includes('price') || title.includes('árcsökkenés') || title.includes('price drop')) {
    return { Icon: TrendingDown, accentClass: 'text-emerald-600 bg-emerald-50' };
  }
  if (type.includes('seller_new') || type.includes('follow') || title.includes('követ')) {
    return { Icon: UserPlus, accentClass: 'text-blue-600 bg-blue-50' };
  }
  if (type.includes('bundle') || title.includes('csomag')) {
    return { Icon: Package, accentClass: 'text-[#007782] bg-[#007782]/10' };
  }
  if (type.includes('favorite') || title.includes('kedvenc')) {
    return { Icon: Heart, accentClass: 'text-rose-600 bg-rose-50' };
  }
  if (type.includes('offer') || title.includes('ajánlat')) {
    return { Icon: Tag, accentClass: 'text-amber-600 bg-amber-50' };
  }
  if (type.includes('message') || title.includes('üzenet')) {
    return { Icon: MessageCircle, accentClass: 'text-gray-600 bg-gray-100' };
  }
  return { Icon: Bell, accentClass: 'text-gray-500 bg-gray-100' };
}
