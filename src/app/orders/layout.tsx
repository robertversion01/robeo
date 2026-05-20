import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Rendeléstörténet | ROBEO',
  description: 'Vásárlásaid és eladásaid egy helyen — státusz, összeg, gyors részletek.',
  path: '/orders',
});

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
