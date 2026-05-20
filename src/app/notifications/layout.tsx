import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Értesítések | ROBEO',
  description: 'Ajánlatok, eladások és egyéb értesítések — olvasott és olvasatlan állapotokkal.',
  path: '/notifications',
});

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
