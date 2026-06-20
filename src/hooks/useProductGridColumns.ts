'use client';

import { useEffect, useState } from 'react';

/** Tailwind grid: 2 / sm:3 / lg:5 / xl:6 */
function columnsForWidth(width: number): number {
  if (width >= 1280) return 6;
  if (width >= 1024) return 5;
  if (width >= 640) return 3;
  return 2;
}

export function useProductGridColumns(): number {
  const [columns, setColumns] = useState(() =>
    typeof window !== 'undefined' ? columnsForWidth(window.innerWidth) : 2,
  );

  useEffect(() => {
    const onResize = () => setColumns(columnsForWidth(window.innerWidth));
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return columns;
}
