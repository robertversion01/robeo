interface PriceBreakdownProps {
  price: number;
  shippingCost?: number;
  className?: string;
}

/**
 * Vinted-stílusú vevővédelmi díj kalkuláció:
 * - 5% a termék árára
 * - Minimum 200 Ft
 * - Maximum 5000 Ft
 */
function calculateBuyerProtection(price: number): number {
  const fee = Math.round(price * 0.05);
  return Math.max(200, Math.min(5000, fee));
}

export default function PriceBreakdown({ price, shippingCost, className = '' }: PriceBreakdownProps) {
  const protectionFee = calculateBuyerProtection(price);
  const shipping = shippingCost ?? 0;
  const total = price + protectionFee + shipping;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Termék ára */}
      <div className="flex justify-between text-sm">
        <span className="text-white/70">Termék ára</span>
        <span className="text-white font-medium">{price.toLocaleString('hu-HU')} Ft</span>
      </div>

      {/* Vevővédelmi díj (Vinted-stílus) */}
      <div className="flex justify-between text-sm">
        <span className="text-white/70 flex items-center gap-1">
          Vevővédelem
          <span className="text-[10px] text-white/40 cursor-help" title="5% a termék árára (min. 200 Ft, max. 5000 Ft)">ⓘ</span>
        </span>
        <span className="text-white/80 font-medium">{protectionFee.toLocaleString('hu-HU')} Ft</span>
      </div>

      {/* Szállítási költség (ha van) */}
      {shippingCost !== undefined && (
        <div className="flex justify-between text-sm">
          <span className="text-white/70">Szállítás</span>
          <span className="text-white font-medium">
            {shippingCost > 0 ? `${shippingCost.toLocaleString('hu-HU')} Ft` : 'Ingyenes'}
          </span>
        </div>
      )}

      {/* Elválasztó */}
      <div className="border-t border-white/10" />

      {/* Végösszeg */}
      <div className="flex justify-between font-bold">
        <span className="text-white">Végösszeg</span>
        <span className="text-accent text-lg">{total.toLocaleString('hu-HU')} Ft</span>
      </div>

      {/* Vinted-stílusú lábjegyzet */}
      <div className="text-[10px] text-white/30 text-center pt-1">
        A vevővédelmi díj segít biztonságosabbá tenni a vásárlást.
        {shippingCost !== undefined && ' A szállítási költség a választott módtól függ.'}
      </div>
    </div>
  );
}

export { calculateBuyerProtection };