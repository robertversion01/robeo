import { buyerProtectionFeeLabel, calculateBuyerProtection } from '@/lib/buyerProtection';

interface PriceBreakdownProps {
  price: number;
  shippingCost?: number;
  className?: string;
}

export default function PriceBreakdown({ price, shippingCost, className = '' }: PriceBreakdownProps) {
  const protectionFee = calculateBuyerProtection(price);
  const shipping = shippingCost ?? 0;
  const total = price + protectionFee + shipping;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Termék ára */}
      <div className="flex justify-between text-sm">
        <span className="text-[#8fa3ad]">Termék ára</span>
        <span className="text-[#e7edf0] font-medium">{price.toLocaleString('hu-HU')} Ft</span>
      </div>

      {/* Vevővédelmi díj (Vinted-stílus) */}
      <div className="flex justify-between text-sm">
        <span className="text-[#8fa3ad] flex items-center gap-1">
          Vevővédelem
          <span
            className="text-[10px] text-[#6b7d85] cursor-help"
            title="280 Ft fix díj + 5% a termék árára (Vinted HU)"
          >
            ⓘ
          </span>
        </span>
        <span className="text-[#e7edf0] font-medium text-right">
          {protectionFee.toLocaleString('hu-HU')} Ft
          <span className="block text-[10px] text-[#6b7d85] font-normal">
            ({buyerProtectionFeeLabel(price)})
          </span>
        </span>
      </div>

      {/* Szállítási költség (ha van) */}
      {shippingCost !== undefined && (
        <div className="flex justify-between text-sm">
          <span className="text-[#8fa3ad]">Szállítás</span>
          <span className="text-[#e7edf0] font-medium">
            {shippingCost > 0 ? `${shippingCost.toLocaleString('hu-HU')} Ft` : 'Ingyenes'}
          </span>
        </div>
      )}

      {/* Elválasztó */}
      <div className="border-t border-[#2a3941]" />

      {/* Végösszeg */}
      <div className="flex justify-between font-bold">
        <span className="text-[#e7edf0]">Végösszeg</span>
        <span className="text-accent text-lg">{total.toLocaleString('hu-HU')} Ft</span>
      </div>

      {/* Vinted-stílusú lábjegyzet */}
      <div className="text-[10px] text-[#6b7d85] text-center pt-1">
        A vevővédelmi díj segít biztonságosabbá tenni a vásárlást.
        {shippingCost !== undefined && ' A szállítási költség a választott módtól függ.'}
      </div>
    </div>
  );
}

export { calculateBuyerProtection } from '@/lib/buyerProtection';