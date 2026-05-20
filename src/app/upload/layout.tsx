import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Termék feltöltése | ROBEO',
  description: 'Add fel használt ruháidat lépésről lépésre — fotók, kategória, ár, leírás.',
  path: '/upload',
});

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
