/**
 * Budapest 23 közigazgatási kerülete — RobeoBP lokalizációhoz.
 *
 * `id`     → DB-be írandó kanonikus érték (`I` … `XXIII`)
 * `label`  → UI megjelenítés (`I. kerület` … `XXIII. kerület`)
 * `short`  → kompakt forma chip-eken / sz\u0171r\u0151kben (`I. ker.`)
 */

export type BudapestDistrict = {
  id: string;
  label: string;
  short: string;
};

const ROMAN_DISTRICTS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
  'XXI',
  'XXII',
  'XXIII',
] as const;

export const BUDAPEST_DISTRICTS: BudapestDistrict[] = ROMAN_DISTRICTS.map((id) => ({
  id,
  label: `${id}. kerület`,
  short: `${id}. ker.`,
}));

/** Gyors lookup: valid kerület-e a megadott érték? */
export function isValidBudapestDistrict(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return ROMAN_DISTRICTS.includes(value as (typeof ROMAN_DISTRICTS)[number]);
}

/** Normalizálás: trim + uppercase + római szám validálás; ha nem valid → null. */
export function normalizeBudapestDistrict(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = String(value).trim().toUpperCase();
  if (isValidBudapestDistrict(trimmed)) return trimmed;
  return null;
}

export function getDistrictLabel(value: string | null | undefined): string {
  const normalized = normalizeBudapestDistrict(value);
  if (!normalized) return '';
  const def = BUDAPEST_DISTRICTS.find((d) => d.id === normalized);
  return def?.label ?? '';
}
