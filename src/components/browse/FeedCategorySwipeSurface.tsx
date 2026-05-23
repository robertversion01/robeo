'use client';

import { useEffect, useState } from 'react';
import { useFeedCategorySwipe } from '@/hooks/useFeedCategorySwipe';
import { cn } from '@/lib/utils';

type Category = { id: string; label: string };

type Props = {
  children: React.ReactNode;
  enabled: boolean;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  className?: string;
};

/** Mobil feed: teljes képernyős horizontális swipe → kategória tab váltás. */
export default function FeedCategorySwipeSurface({
  children,
  enabled,
  categories,
  selectedCategory,
  onCategoryChange,
  className,
}: Props) {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const active = enabled && mobile;
  const { swipeHandlers } = useFeedCategorySwipe({
    enabled: active,
    categories,
    selectedCategory,
    onCategoryChange,
  });

  if (!active) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn('touch-pan-y', className)}
      aria-label="feed-category-swipe"
      {...swipeHandlers}
    >
      {children}
    </div>
  );
}
