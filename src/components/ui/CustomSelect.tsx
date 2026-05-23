'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_BOTTOM_NAV_RESERVE_PX } from '@/lib/layoutTokens';

interface Option {
  value: string;
  label: string;
}

interface DropdownCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Viewport alján fenntartott px (pl. sticky gombsor). */
  bottomReservePx?: number;
  maxDropdownHeight?: number;
}

const DEFAULT_BOTTOM_RESERVE = MOBILE_BOTTOM_NAV_RESERVE_PX;
const DEFAULT_MAX_HEIGHT = 280;
const MIN_DROPDOWN_HEIGHT = 120;
const VIEWPORT_EDGE_GAP = 8;

export default function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Válassz opciót',
  bottomReservePx = DEFAULT_BOTTOM_RESERVE,
  maxDropdownHeight = DEFAULT_MAX_HEIGHT,
}: CustomSelectProps) {
  const instanceId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - bottomReservePx - VIEWPORT_EDGE_GAP;
    const spaceAbove = rect.top - VIEWPORT_EDGE_GAP;
    const openUp = spaceBelow < MIN_DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(
      MIN_DROPDOWN_HEIGHT,
      Math.min(maxDropdownHeight, available),
    );

    const panelWidth = rect.width;
    const maxLeft = Math.max(VIEWPORT_EDGE_GAP, window.innerWidth - panelWidth - VIEWPORT_EDGE_GAP);
    const left = Math.min(rect.left, maxLeft);

    if (openUp) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width: panelWidth,
        maxHeight,
        openUp: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        width: panelWidth,
        maxHeight,
        openUp: false,
      });
    }
  }, [bottomReservePx, maxDropdownHeight]);

  useLayoutEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, updateCoords, options.length]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const panel =
    isOpen && coords && mounted ? (
      <div
        ref={panelRef}
        id={`${instanceId}-listbox`}
        role="listbox"
        className={cn(
          'fixed z-[10050] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white shadow-xl',
          'pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]',
          'animate-in fade-in duration-200',
          coords.openUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2',
        )}
        style={{
          top: coords.top,
          bottom: coords.bottom,
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={value === option.value}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            className={cn(
              'block w-full px-4 py-3 text-left transition-colors touch-manipulation',
              'hover:bg-[#007782]/10 active:bg-[#007782]/15',
              value === option.value
                ? 'bg-[#007782]/10 text-[#007782] font-medium'
                : 'text-gray-700',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${instanceId}-listbox` : undefined}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          'w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-[#007782] focus:ring-1 focus:ring-[#007782] transition-all flex items-center justify-between touch-manipulation',
          value ? 'bg-[#007782]/10 border-[#007782]/40 text-gray-900' : 'bg-white border-gray-300 text-gray-900',
        )}
      >
        <span className={value ? 'font-medium' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={cn('shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>
      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
