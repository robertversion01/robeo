import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Frissített feltételek | ROBEO',
  description: 'Fogadd el a frissített ÁSZF-et és adatvédelmi tájékoztatót.',
  path: '/legal/reaccept',
  noIndex: true,
});

export default function LegalReacceptLayout({ children }: { children: React.ReactNode }) {
  return children;
}
