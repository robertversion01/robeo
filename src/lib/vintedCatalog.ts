/** Kanonikus Vinted-stílusú márka / méret katalógusok (V1). */

export const VINTED_CATEGORIES = [
  { id: 'clothing', label: 'Ruházat' },
  { id: 'shoes', label: 'Cipő' },
  { id: 'accessories', label: 'Kiegészítők' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'other', label: 'Egyéb' },
] as const;

export const VINTED_BRANDS = [
  'Nike',
  'Adidas',
  'Zara',
  'H&M',
  'Bershka',
  'Pull&Bear',
  'Mango',
  'Reserved',
  'Cropp',
  'House',
  'Sinsay',
  'New Yorker',
  'Puma',
  'Reebok',
  'Under Armour',
  'Levi\'s',
  'Tommy Hilfiger',
  'Calvin Klein',
  'Guess',
  'Lacoste',
  'Vans',
  'Converse',
  'New Balance',
  'The North Face',
  'Columbia',
  'Patagonia',
  'Primark',
  'Stradivarius',
  'Massimo Dutti',
  'COS',
  'Uniqlo',
  'Egyéb',
] as const;

export const CLOTHING_SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Egy méret'] as const;

export const SHOE_SIZES = [
  '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', 'Egy méret',
] as const;

export const ACCESSORY_SIZES = ['Egy méret', 'S', 'M', 'L'] as const;

export const ELECTRONICS_SIZES = ['Egy méret'] as const;

export function sizesForCategory(category: string): readonly string[] {
  switch (category) {
    case 'shoes':
      return SHOE_SIZES;
    case 'accessories':
      return ACCESSORY_SIZES;
    case 'electronics':
      return ELECTRONICS_SIZES;
    case 'clothing':
    default:
      return CLOTHING_SIZES;
  }
}

/** Szűrő / feltöltés állapotok (Vinted HU). */
export const VINTED_CONDITIONS = [
  { id: 'new', label: 'Új címkével', aliases: ['new', 'uj', 'új'] },
  { id: 'excellent', label: 'Kiváló', aliases: ['excellent', 'kivalo', 'kiváló'] },
  { id: 'very_good', label: 'Nagyon jó', aliases: ['very_good', 'very good', 'nagyon jo', 'nagyon jó'] },
  { id: 'good', label: 'Jó', aliases: ['good', 'jo', 'jó'] },
] as const;

export type VintedConditionId = (typeof VINTED_CONDITIONS)[number]['id'];

export function conditionMatchesFilter(
  productCondition: string | null | undefined,
  filterId: string,
): boolean {
  if (!productCondition?.trim()) return false;
  const normalized = productCondition
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const def = VINTED_CONDITIONS.find((c) => c.id === filterId);
  if (!def) return normalized === filterId;
  return def.aliases.some((a) => {
    const alias = a
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    return normalized === alias || normalized.includes(alias);
  });
}

export const DEFAULT_BUNDLE_TIERS = [
  { items: 2, percent: 10 },
  { items: 3, percent: 15 },
  { items: 5, percent: 20 },
] as const;

export type BundleTier = { items: number; percent: number };
