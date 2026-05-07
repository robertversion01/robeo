'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';

// Use dynamic import with { ssr: false } to prevent server-side rendering
const CheckoutContent = dynamic(() => import('./CheckoutContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white flex items-center justify-center">
      <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
    </div>
  ),
});

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-gradient-to-br dark:from-indigo-950 dark:to-black text-gray-900 dark:text-white flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}