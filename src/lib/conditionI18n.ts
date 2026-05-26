import type { TFunction } from 'i18next';

/** DB / szűrő állapot érték normalizálása (good, very_good, új, stb.). */
export function normalizeConditionId(condition: string): string {
  return condition
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[\s-]+/g, '_');
}

const CONDITION_I18N_KEYS: Record<string, string> = {
  new: 'upload.conditions.new',
  excellent: 'upload.conditions.excellent',
  very_good: 'upload.conditions.veryGood',
  good: 'upload.conditions.good',
  fair: 'upload.conditions.fair',
  poor: 'upload.conditions.poor',
  like_new: 'upload.conditions.likeNew',
  satisfactory: 'upload.conditions.satisfactory',
  uj: 'upload.conditions.new',
  uj_cimkevel: 'upload.conditions.newWithTag',
  kivalo: 'upload.conditions.excellent',
  nagyon_jo: 'upload.conditions.veryGood',
  jo: 'upload.conditions.good',
};

export function conditionI18nKey(condition: string | null | undefined): string {
  if (!condition?.trim()) return 'upload.conditions.unknown';
  return CONDITION_I18N_KEYS[normalizeConditionId(condition)] ?? 'upload.conditions.unknown';
}

export function formatConditionLabel(t: TFunction, condition: string | null | undefined): string {
  if (!condition?.trim()) return '';
  const key = conditionI18nKey(condition);
  const translated = t(key);
  if (translated !== key) return translated;
  return condition.replace(/_/g, ' ');
}

export function conditionFilterOptions(t: TFunction): { id: string; label: string }[] {
  return [
    { id: 'new', label: t('upload.conditions.new') },
    { id: 'excellent', label: t('upload.conditions.excellent') },
    { id: 'very_good', label: t('upload.conditions.veryGood') },
    { id: 'good', label: t('upload.conditions.good') },
  ];
}
