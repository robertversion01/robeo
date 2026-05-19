import PublicSellerProfile from '@/components/profile/PublicSellerProfile';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  return <PublicSellerProfile sellerId={id} />;
}
