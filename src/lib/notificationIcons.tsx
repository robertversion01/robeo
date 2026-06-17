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

/** Vinted dark — finom színes ikon-háttér, ne világos bg-*-50. */
export function getNotificationVisual(row: AppNotificationRow): NotificationVisual {
  const type = (row.type || '').toLowerCase();
  const title = (row.title || '').toLowerCase();

  if (type.includes('saved_search') || title.includes('mentett keresés')) {
    return { Icon: Search, accentClass: 'text-violet-300 bg-violet-950/50 border border-violet-900/40' };
  }
  if (type.includes('price') || title.includes('árcsökkenés') || title.includes('price drop')) {
    return { Icon: TrendingDown, accentClass: 'text-emerald-300 bg-emerald-950/50 border border-emerald-900/40' };
  }
  if (type.includes('seller_new') || type.includes('follow') || title.includes('követ')) {
    return { Icon: UserPlus, accentClass: 'text-sky-300 bg-sky-950/50 border border-sky-900/40' };
  }
  if (type.includes('bundle') || title.includes('csomag')) {
    return { Icon: Package, accentClass: 'text-[#38c7d0] bg-[#17343a] border border-[#2a3941]' };
  }
  if (type.includes('favorite') || title.includes('kedvenc')) {
    return { Icon: Heart, accentClass: 'text-rose-300 bg-rose-950/50 border border-rose-900/40' };
  }
  if (type.includes('offer') || title.includes('ajánlat')) {
    return { Icon: Tag, accentClass: 'text-amber-300 bg-amber-950/50 border border-amber-900/40' };
  }
  if (type.includes('message') || title.includes('üzenet')) {
    return { Icon: MessageCircle, accentClass: 'text-[#b2c0c6] bg-[#1a2328] border border-[#2a3941]' };
  }
  return { Icon: Bell, accentClass: 'text-[#8fa3ad] bg-[#1a2328] border border-[#2a3941]' };
}
