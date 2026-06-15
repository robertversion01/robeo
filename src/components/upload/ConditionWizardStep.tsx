'use client';

import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { VINTED_CONDITIONS } from '@/lib/vintedCatalog';
import { conditionI18nKey } from '@/lib/conditionI18n';
import { cn } from '@/lib/utils';

const CHECKLIST_KEYS: Record<string, string[]> = {
  new: ['upload.conditionWizard.check.newTag', 'upload.conditionWizard.check.noWear'],
  excellent: ['upload.conditionWizard.check.likeNew', 'upload.conditionWizard.check.noFlaws'],
  very_good: ['upload.conditionWizard.check.lightWear', 'upload.conditionWizard.check.noStains'],
  good: ['upload.conditionWizard.check.normalWear', 'upload.conditionWizard.check.clean'],
  fair: ['upload.conditionWizard.check.visibleWear', 'upload.conditionWizard.check.photoDefects'],
  poor: ['upload.conditionWizard.check.heavyWear', 'upload.conditionWizard.check.photoDefects'],
};

type Props = {
  value: string;
  onChange: (conditionId: string) => void;
  requiresDefectPhoto?: boolean;
  onRequiresDefectPhotoChange?: (required: boolean) => void;
};

export default function ConditionWizardStep({
  value,
  onChange,
  requiresDefectPhoto,
  onRequiresDefectPhotoChange,
}: Props) {
  const { t } = useTranslation();

  const options = [
    ...VINTED_CONDITIONS,
    { id: 'fair', label: 'Fair', aliases: ['fair'] as const },
    { id: 'poor', label: 'Poor', aliases: ['poor'] as const },
  ];

  const checklist = value ? CHECKLIST_KEYS[value] || [] : [];
  const needsDefect = value === 'fair' || value === 'poor';

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">{t('upload.conditionWizard.intro')}</p>
      <div className="grid gap-2">
        {options.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                onRequiresDefectPhotoChange?.(opt.id === 'fair' || opt.id === 'poor');
              }}
              className={cn(
                'rounded-xl border p-3 text-left transition-colors',
                selected
                  ? 'border-[#007782] bg-[#007782]/5 ring-1 ring-[#007782]/30'
                  : 'border-gray-200 hover:border-[#007782]/40',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {t(conditionI18nKey(opt.id))}
                </span>
                {selected ? <Check size={16} className="text-[#007782]" /> : null}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t(`upload.conditionWizard.desc.${opt.id}`)}
              </p>
            </button>
          );
        })}
      </div>
      {checklist.length > 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs font-semibold text-gray-800 mb-2">
            {t('upload.conditionWizard.checklistTitle')}
          </p>
          <ul className="space-y-1">
            {checklist.map((key) => (
              <li key={key} className="text-xs text-gray-600 flex items-start gap-1.5">
                <span className="text-[#007782] mt-0.5">•</span>
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {needsDefect && requiresDefectPhoto ? (
        <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t('upload.conditionWizard.defectPhotoRequired')}
        </p>
      ) : null}
    </div>
  );
}
