'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const CheckoutContent = dynamic(() => import('./CheckoutContent'), { ssr: false });
const CheckoutBundleContent = dynamic(() => import('./CheckoutBundleContent'), { ssr: false });

function CheckoutRouterInner() {
  const searchParams = useSearchParams();
  const isBundle = searchParams.get('bundle') === '1';

  if (isBundle) {
    return <CheckoutBundleContent />;
  }
  return <CheckoutContent />;
}

export default function CheckoutPageRouter() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#007782] border-t-transparent rounded-full" />
        </div>
      }
    >
      <CheckoutRouterInner />
    </Suspense>
  );
}
