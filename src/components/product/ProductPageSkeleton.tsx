import { MAIN_TOP_PADDING, MOBILE_PRODUCT_STICKY_CTA_PAD } from '@/lib/layoutTokens';

/** PDP első render — azonnali layout, nincs teljes képernyős spinner. */
export default function ProductPageSkeleton() {
  return (
    <div className={`min-h-screen bg-[#11171a] text-[#e7edf0] ${MAIN_TOP_PADDING} ${MOBILE_PRODUCT_STICKY_CTA_PAD}`}>
      <div className="px-3 md:px-6 max-w-5xl mx-auto">
        <div className="h-4 w-28 bg-[#1a2328] rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-10">
          <div className="aspect-[4/5] md:aspect-square rounded-xl bg-[#141d21] border border-[#2a3941] animate-pulse" />
          <div className="px-3 md:px-0 pt-4 md:pt-0 space-y-3">
            <div className="h-5 w-2/3 bg-[#1a2328] rounded animate-pulse" />
            <div className="h-8 w-1/3 bg-[#1a2328] rounded animate-pulse" />
            <div className="h-4 w-full bg-[#141d21] rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-[#141d21] rounded animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-11 flex-1 bg-[#1a2328] rounded-xl animate-pulse" />
              <div className="h-11 flex-1 bg-[#007782]/30 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
