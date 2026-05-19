'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterOption = { id: string; label: string };

type Props = {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (id: string) => void;
  active?: boolean;
  className?: string;
};

export default function FilterChipDropdown({
  label,
  options,
  value,
  onChange,
  active,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);
  const isActive = active ?? value !== 'all';

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative shrink-0', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors',
          isActive
            ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        )}
      >
        {selected && value !== 'all' ? selected.label : label}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-3 py-2 text-left text-sm hover:bg-gray-50',
                value === opt.id && 'font-semibold text-[#007782] bg-[#007782]/5',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
