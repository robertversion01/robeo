'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({ 
  rating, 
  maxRating = 5, 
  size = 18, 
  interactive = false,
  onRate 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = interactive 
          ? (hoverRating || rating) >= starValue 
          : rating >= starValue;
        const isPartial = !interactive && rating > index && rating < starValue;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={cn(
              "transition-colors",
              interactive ? "cursor-pointer hover:scale-110" : "cursor-default"
            )}
          >
            <Star 
              size={size}
              className={cn(
                "transition-colors",
                isFilled ? "fill-accent text-accent" : "fill-transparent text-muted-foreground",
                isPartial && "fill-[50%]"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}