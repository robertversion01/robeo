'use client';

import { useState } from 'react';
import { Share2, Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import ReportProductModal from '@/components/product/ReportProductModal';

type Props = {
  productId: string;
  productName: string;
  className?: string;
};

export default function ProductShareReportBar({ productId, productName, className = '' }: Props) {
  const { t } = useTranslation();
  const [reportOpen, setReportOpen] = useState(false);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({
          title: productName,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t('product.shareCopied'));
    } catch {
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
          toast.success(t('product.shareCopied'));
        } catch {
          toast.error(t('product.shareFailed'));
        }
      }
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm hover:border-[#007782]/30 hover:text-[#007782]"
          aria-label={t('product.share')}
        >
          <Share2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm hover:border-red-200 hover:text-red-600"
          aria-label={t('product.report')}
        >
          <Flag size={18} />
        </button>
      </div>
      <ReportProductModal
        productId={productId}
        productName={productName}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
