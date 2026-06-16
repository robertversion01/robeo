'use client';

import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROBEO_BP_MODE } from '@/lib/features';
import { getDistrictLabel, normalizeBudapestDistrict } from '@/lib/budapestDistricts';
import {
  getMeetingPointsForDistrict,
  MEETING_POINT_SAFETY_TIPS,
} from '@/lib/budapestMeetingPoints';
import { cn } from '@/lib/utils';

type Props = {
  district: string | null | undefined;
  className?: string;
};

/**
 * BP-only: ajanlott szemelyes atveteli helyek a termekoldalon, mar a
 * kapcsolatfelvetel elott — kevesebb bizonytalansag, biztonsagosabb talalkozo.
 */
export default function DistrictMeetingHint({ district, className }: Props) {
  const { t } = useTranslation();
  if (!ROBEO_BP_MODE) return null;

  const normalized = normalizeBudapestDistrict(district);
  const points = getMeetingPointsForDistrict(normalized);
  if (points.length === 0) return null;

  const districtLabel = getDistrictLabel(normalized);

  return (
    <div className={cn('rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3 py-2.5', className)}>
      <p className="flex items-center gap-1 text-xs font-semibold text-emerald-900">
        <MapPin size={13} aria-hidden />
        {districtLabel
          ? t('bp.meeting.titleDistrict', { district: districtLabel })
          : t('bp.meeting.titleGeneric')}
      </p>
      <ul className="mt-2 space-y-1">
        {points.slice(0, 3).map((point) => (
          <li key={point.id} className="text-[11px] leading-snug text-gray-700">
            <span className="font-medium">{point.label}</span>
            {point.hint ? <span className="block text-[10px] text-gray-500">{t(point.hint)}</span> : null}
          </li>
        ))}
      </ul>
      <ul className="mt-2 space-y-0.5 border-t border-emerald-100 pt-2">
        {MEETING_POINT_SAFETY_TIPS.map((tipKey) => (
          <li key={tipKey} className="text-[10px] text-emerald-800/90">
            · {t(tipKey)}
          </li>
        ))}
      </ul>
    </div>
  );
}
