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
      <label className="block text-sm font-medium text-white/90 mb-3">Szállítási mód</label>
      {SHIPPING_OPTIONS.map((option) => {
        const Icon = iconMap[option.icon];
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left
              ${isSelected 
                ? 'bg-accent/10 border-accent/50 text-white' 
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${isSelected ? 'bg-accent/20 text-accent' : 'bg-white/10 text-white/50'}
            `}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-white/40">{option.days}</div>
            </div>
            <div className={`
              font-bold text-sm flex-shrink-0
              ${isSelected ? 'text-accent' : 'text-white/60'}
            `}>
              {option.cost.toLocaleString('hu-HU')} Ft
            </div>
          </button>
        );
      })}
    </div>
  );
}