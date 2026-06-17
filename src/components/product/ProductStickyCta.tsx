'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Props = {
  productId: string;
  sellerId: string;
  acceptedOffer: { id: string; offered_price: number } | null;
  onOffer: () => void;
  onMessage: () => void;
  className?: string;
};

export default function ProductStickyCta({
  productId,
  sellerId,
  acceptedOffer,
  onOffer,
  onMessage,
  className,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleBuy = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }
    if (sellerId === user.id) {
      toast.error(t('checkout.errors.ownProduct'));
      return;
    }
    router.push(acceptedOffer ? `/checkout?offer=${acceptedOffer.id}` : `/checkout?id=${productId}`);
  };

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-[90] border-t border-[#2a3941] bg-[#11171a]/95 backdrop-blur-lg px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.08)]',
        'pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]',
        'max-md:bottom-0',
        'md:static md:mt-4 md:border-t-0 md:bg-transparent md:backdrop-blur-none md:shadow-none md:p-0 md:space-y-3',
        className,
      )}
    >
      <button type="button" onClick={() => void handleBuy()} className="w-full btn-base btn-primary">
        {acceptedOffer ? t('product.buyOfferPrice') : t('product.buy')}
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onOffer} className="btn-base btn-secondary text-sm">
          {t('product.makeOffer')}
        </button>
        <button type="button" onClick={onMessage} className="btn-base btn-secondary text-sm">
          {t('product.messageSeller')}
        </button>
      </div>
    </div>
  );
}
