'use client';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { shouldUseProductViewTransition } from '@/lib/productViewTransition';

export function navigateWithViewTransition(
  router: AppRouterInstance,
  href: string,
  options?: { skipTransition?: boolean },
): void {
  if (options?.skipTransition || !shouldUseProductViewTransition()) {
    router.push(href);
    return;
  }

  const doc = document as Document & {
    startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
  };

  doc.startViewTransition?.(() => {
    router.push(href);
  });
}
