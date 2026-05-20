import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Üzenetek | ROBEO',
  description: 'Beszélgetések, ajánlatok és rendelésállapot egy helyen.',
  path: '/messages',
  noIndex: true,
});

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
