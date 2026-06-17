import ProductGridSkeleton from '@/components/product/ProductGridSkeleton';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function ProfilePageSkeleton() {
  return (
    <div className={`min-h-screen bg-[#11171a] text-[#e7edf0] ${MAIN_TOP_PADDING} px-3 md:px-6`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-full bg-[#1a2328] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-[#1a2328] rounded animate-pulse" />
            <div className="h-3 w-48 bg-[#141d21] rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4 mb-4 border-b border-[#2a3941] pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-16 bg-[#1a2328] rounded animate-pulse" />
          ))}
        </div>
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
