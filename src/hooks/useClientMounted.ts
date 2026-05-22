'use client';

import { useEffect, useState } from 'react';

/** SSR / első kliens render egyeztetése — időfüggő UI-hoz. */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
