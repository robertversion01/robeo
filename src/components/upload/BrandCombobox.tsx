'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  filterVintedBrands,
  normalizeBrandQuery,
  VINTED_BRANDS,
} from '@/lib/vintedCatalog';
import { MOBILE_BOTTOM_NAV_RESERVE_PX } from '@/lib/layoutTokens';

type DropdownCoords = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  bottomReservePx?: number;
  maxDropdownHeight?: number;
};

const DEFAULT_BOTTOM_RESERVE = MOBILE_BOTTOM_NAV_RESERVE_PX;
const DEFAULT_MAX_HEIGHT = 260;
const MIN_DROPDOWN_HEIGHT = 120;
const VIEWPORT_EDGE_GAP = 8;
const MIN_CUSTOM_LEN = 2;

export default function BrandCombobox({
  value,
  onChange,
  placeholder,
  bottomReservePx = DEFAULT_BOTTOM_RESERVE,
  maxDropdownHeight = DEFAULT_MAX_HEIGHT,
}: Props) {
  const { t } = useTranslation();
  const instanceId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const blurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const filteredBrands = useMemo(() => filterVintedBrands(query), [query]);
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeBrandQuery(trimmedQuery);
  const exactCatalogMatch = useMemo(
    () =>
      normalizedQuery.length > 0 &&
      VINTED_BRANDS.some((b) => normalizeBrandQuery(b) === normalizedQuery),
    [normalizedQuery],
  );
  const showCustomOption =
    trimmedQuery.length >= MIN_CUSTOM_LEN && !exactCatalogMatch;

  const optionCount = filteredBrands.length + (showCustomOption ? 1 : 0);

  const commit = useCallback(
    (brand: string) => {
      const next = brand.trim();
      if (next.length < MIN_CUSTOM_LEN) return;
      onChange(next);
      setQuery(next);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const updateCoords = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
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
  }, [open, updateCoords, optionCount]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (inputRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const clearBlurTimer = () => {
    if (blurTimerRef.current != null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearBlurTimer();
    blurTimerRef.current = window.setTimeout(() => setOpen(false), 160);
  };

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    setActiveIndex(-1);
    if (next.trim().length >= MIN_CUSTOM_LEN) {
      onChange(next.trim());
    } else if (!next.trim()) {
      onChange('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, optionCount - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0) {
        if (showCustomOption && activeIndex === 0) {
          commit(trimmedQuery);
          return;
        }
        const brandIndex = showCustomOption ? activeIndex - 1 : activeIndex;
        const brand = filteredBrands[brandIndex];
        if (brand) commit(brand);
        return;
      }
      if (trimmedQuery.length >= MIN_CUSTOM_LEN) commit(trimmedQuery);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  };

  const panel =
    open && coords && mounted ? (
      <div
        ref={panelRef}
        id={`${instanceId}-listbox`}
        role="listbox"
        className={cn(
          'fixed z-[10050] overflow-y-auto overscroll-contain rounded-xl border border-[#2a3941] bg-[#1a2328] shadow-xl',
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
        {showCustomOption ? (
          <button
            type="button"
            role="option"
            aria-selected={value === trimmedQuery}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => commit(trimmedQuery)}
            className={cn(
              'block w-full border-b border-[#27363d] px-4 py-3 text-left transition-colors touch-manipulation',
              'hover:bg-[#007782]/10 active:bg-[#007782]/15',
              activeIndex === 0 ? 'bg-[#007782]/10' : '',
            )}
          >
            <span className="block text-sm font-semibold text-[#007782]">
              {t('upload.brandUseCustom', { brand: trimmedQuery })}
            </span>
            <span className="mt-0.5 block text-[11px] text-[#8fa3ad]">
              {t('upload.brandCustomHint')}
            </span>
          </button>
        ) : null}

        {filteredBrands.length === 0 && !showCustomOption ? (
          <p className="px-4 py-3 text-sm text-[#8fa3ad]">{t('upload.brandNoResults')}</p>
        ) : (
          filteredBrands.map((brand, index) => {
            const optionIndex = showCustomOption ? index + 1 : index;
            const selected = normalizeBrandQuery(value) === normalizeBrandQuery(brand);
            return (
              <button
                key={brand}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => commit(brand)}
                className={cn(
                  'block w-full px-4 py-3 text-left text-sm transition-colors touch-manipulation',
                  'hover:bg-[#007782]/10 active:bg-[#007782]/15',
                  selected ? 'bg-[#007782]/10 font-medium text-[#007782]' : 'text-[#b2c0c6]',
                  activeIndex === optionIndex ? 'bg-[#007782]/10' : '',
                )}
              >
                {brand}
              </button>
            );
          })
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7d85]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? `${instanceId}-listbox` : undefined}
          value={query}
          placeholder={placeholder ?? t('upload.brandSearchPlaceholder')}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            clearBlurTimer();
            setOpen(true);
            updateCoords();
          }}
          onBlur={scheduleClose}
          onKeyDown={handleKeyDown}
          className={cn(
            'input-base w-full min-h-12 pl-10 pr-4 text-base',
            value ? 'border-[#007782]/40 bg-[#007782]/5' : '',
          )}
        />
      </div>
      <p className="text-[11px] leading-snug text-[#8fa3ad]">{t('upload.brandTypeaheadHint')}</p>
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
