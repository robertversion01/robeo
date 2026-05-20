import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Böngészés | ROBEO',
  description: 'Keress márkákra, kategóriákra és méretre. Szűrj ár szerint és ments kereséseket.',
  path: '/browse',
});

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
