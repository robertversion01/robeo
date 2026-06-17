'use client';

import { Package, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ShippingOption {
  value: string;
  label: string;
  cost: number;
  days: string;
  icon: 'foxpost' | 'packeta' | 'home';
}

interface ShippingSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: ShippingOption[];
  locale?: string;
}

const iconMap = {
  foxpost: Package,
  packeta: Package,
  home: Home,
};

export default function ShippingSelector({
  value,
  onChange,
  options,
  locale = 'hu-HU',
}: ShippingSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#e7edf0] mb-3">
        {t('checkout.shippingMethodLabel')}
      </label>
      {options.map((option) => {
        const Icon = iconMap[option.icon];
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left touch-manipulation
              ${isSelected
                ? 'bg-[#007782]/10 border-[#007782] text-[#e7edf0] shadow-sm'
                : 'bg-[#141d21] border-[#2a3941] text-[#e7edf0] hover:bg-[#243038] hover:border-[#3d4f58]'
              }
            `}
          >
            <div
              className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${isSelected ? 'bg-[#007782]/15 text-[#007782]' : 'bg-gray-200 text-[#b2c0c6]'}
            `}
            >
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-[#8fa3ad]">{option.days}</div>
            </div>
            <div
              className={`
              font-bold text-sm flex-shrink-0 tabular-nums
              ${isSelected ? 'text-[#007782]' : 'text-[#b2c0c6]'}
            `}
            >
              {option.cost.toLocaleString(locale)} {t('common.currencyHuf')}
            </div>
          </button>
        );
      })}
    </div>
  );
}
