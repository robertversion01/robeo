'use client';

import { Truck, Package, Home } from 'lucide-react';

export interface ShippingOption {
  value: string;
  label: string;
  cost: number;
  days: string;
  icon: 'foxpost' | 'packeta' | 'home';
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { 
    value: 'foxpost', 
    label: 'Foxpost automatába', 
    cost: 1190, 
    days: '2-3 munkanap',
    icon: 'foxpost'
  },
  { 
    value: 'packeta', 
    label: 'Packeta pontba', 
    cost: 990, 
    days: '2-4 munkanap',
    icon: 'packeta'
  },
  { 
    value: 'home', 
    label: 'Házhozszállítás', 
    cost: 1790, 
    days: '1-2 munkanap',
    icon: 'home'
  },
];

interface ShippingSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const iconMap = {
  foxpost: Package,
  packeta: Package,
  home: Home,
};

export default function ShippingSelector({ value, onChange }: ShippingSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800 dark:text-white/90 mb-3">Szállítási mód</label>
      {SHIPPING_OPTIONS.map((option) => {
        const Icon = iconMap[option.icon];
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
              ${isSelected 
                ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-gray-900 dark:text-white shadow-sm'
                : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 hover:border-gray-400 dark:bg-black/40 dark:border-white/25 dark:text-white/80 dark:hover:bg-white/10 dark:hover:border-white/40'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${isSelected ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/25 dark:text-blue-300' : 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-white/60'}
            `}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-gray-500 dark:text-white/50">{option.days}</div>
            </div>
            <div className={`
              font-bold text-sm flex-shrink-0
              ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-white/70'}
            `}>
              {option.cost.toLocaleString('hu-HU')} Ft
            </div>
          </button>
        );
      })}
    </div>
  );
}