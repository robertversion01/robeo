import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Súgó és támogatás | ROBEO',
  description: 'Vásárlói védelem, szállítás, kapcsolat az eladóval és gyakori kérdések.',
  path: '/help',
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
