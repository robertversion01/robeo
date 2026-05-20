import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Belépés | ROBEO',
  description: 'Jelentkezz be vagy regisztrálj a ROBEO piacterére.',
  path: '/auth',
  noIndex: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
