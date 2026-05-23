import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Regisztráció befejezése | ROBEO',
  description: 'Add meg a neved és felhasználóneved a ROBEO fiók befejezéséhez.',
  path: '/auth/complete',
  noIndex: true,
});

export default function AuthCompleteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
