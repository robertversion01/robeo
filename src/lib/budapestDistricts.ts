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

/** Szomszédos kerületek — egyszerűsített statikus térkép (feed-boost, nincs GPS). */
const DISTRICT_NEIGHBORS: Record<string, readonly string[]> = {
  I: ['II', 'V', 'XI', 'XII'],
  II: ['I', 'III', 'XII'],
  III: ['II', 'IV', 'XI', 'XIII'],
  IV: ['III', 'XIII', 'XV'],
  V: ['I', 'VI', 'VII', 'VIII', 'XIII'],
  VI: ['V', 'VII', 'VIII', 'XIII'],
  VII: ['V', 'VI', 'VIII', 'XIII', 'XIV'],
  VIII: ['V', 'VI', 'VII', 'IX', 'X'],
  IX: ['VIII', 'X', 'XI'],
  X: ['VIII', 'IX', 'XI', 'XIII', 'XIV', 'XIX'],
  XI: ['I', 'III', 'IX', 'X', 'XII', 'XXII'],
  XII: ['I', 'II', 'XI', 'XXII'],
  XIII: ['III', 'IV', 'V', 'VI', 'VII', 'X', 'XIV'],
  XIV: ['VII', 'X', 'XIII', 'XV', 'XVI'],
  XV: ['IV', 'XIV', 'XVI'],
  XVI: ['XIV', 'XV', 'XVII'],
  XVII: ['XVI', 'XVIII', 'XIX'],
  XVIII: ['XVII', 'XIX', 'XX'],
  XIX: ['X', 'XVII', 'XVIII', 'XX'],
  XX: ['XVIII', 'XIX', 'XXI'],
  XXI: ['XX', 'XXIII'],
  XXII: ['XI', 'XII'],
  XXIII: ['XXI'],
};

export function getNeighborDistricts(districtId: string): string[] {
  const normalized = normalizeBudapestDistrict(districtId);
  if (!normalized) return [];
  return [...(DISTRICT_NEIGHBORS[normalized] ?? [])];
}

export type DistrictProximity = 'same' | 'neighbor' | 'other';

/** Feed-boost: azonos kerület > szomszéd > egyéb. */
export function districtProximity(
  productDistrict: string | null | undefined,
  homeDistrict: string | null | undefined,
): DistrictProximity {
  const home = normalizeBudapestDistrict(homeDistrict);
  const product = normalizeBudapestDistrict(productDistrict);
  if (!home || !product) return 'other';
  if (product === home) return 'same';
  if (getNeighborDistricts(home).includes(product)) return 'neighbor';
  return 'other';
}
