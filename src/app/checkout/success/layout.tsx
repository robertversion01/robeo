import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Sikeres vásárlás | ROBEO',
  description: 'A rendelésed rögzítve lett. Kövesd a szállítást az üzenetekben.',
  path: '/checkout/success',
  noIndex: true,
});

export default function CheckoutSuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
