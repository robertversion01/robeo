import BrowsePageClient from '@/components/browse/BrowsePageClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function BrowsePage() {
  return <BrowsePageClient />;
}
