'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FilterOption = { id: string; label: string };

type PanelCoords = {
  top: number;
  left: number;
  minWidth: number;
};

type Props = {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (id: string) => void;
  active?: boolean;
  className?: string;
  panelId: string;
  openPanelId: string | null;
  onOpenPanelChange: (id: string | null) => void;
};

export default function FilterChipDropdown({
  label,
  options,
  value,
  onChange,
  active,
  className,
  panelId,
  openPanelId,
  onOpenPanelChange,
}: Props) {
  const instanceId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const [mounted, setMounted] = useState(false);

  const open = openPanelId === panelId;
  const selected = options.find((o) => o.id === value);
  const isActive = active ?? value !== 'all';

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelWidth = Math.max(rect.width, 160);
    const maxLeft = Math.max(8, window.innerWidth - panelWidth - 8);
    const left = Math.min(rect.left, maxLeft);
    setCoords({
      top: rect.bottom + 6,
      left,
      minWidth: panelWidth,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, updateCoords, options.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenPanelChange(null);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenPanelChange(null);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenPanelChange]);

  const toggleOpen = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) {
      onOpenPanelChange(null);
    } else {
      onOpenPanelChange(panelId);
    }
  };

  const panel =
    open && coords && mounted ? (
      <div
        ref={panelRef}
        id={`${instanceId}-panel`}
        role="listbox"
        className="fixed z-[10050] max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        style={{
          top: coords.top,
          left: coords.left,
          minWidth: coords.minWidth,
        }}
      >
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="option"
            aria-selected={value === opt.id}
            onClick={(e) => {
              e.stopPropagation();
              onChange(opt.id);
              onOpenPanelChange(null);
            }}
            className={cn(
              'block w-full px-3 py-2.5 text-left text-sm hover:bg-gray-50 active:bg-gray-100',
              value === opt.id && 'font-semibold text-[#007782] bg-[#007782]/5',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <div className={cn('relative shrink-0', className)}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? `${instanceId}-panel` : undefined}
          onPointerDown={toggleOpen}
          onClick={(e) => e.preventDefault()}
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors touch-manipulation',
            open || isActive
              ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
          )}
        >
          {selected && value !== 'all' ? selected.label : label}
          <ChevronDown size={14} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
