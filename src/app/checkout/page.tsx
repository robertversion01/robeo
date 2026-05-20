'use client';

import dynamic from 'next/dynamic';

const CheckoutPageRouter = dynamic(() => import('./CheckoutPageRouter'), { ssr: false });

export default function CheckoutPage() {
  return <CheckoutPageRouter />;
}