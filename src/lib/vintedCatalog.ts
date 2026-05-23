/** Kanonikus Vinted-stílusú márka / méret katalógusok (V1). */

export const VINTED_CATEGORIES = [
  { id: 'clothing', label: 'Ruházat' },
  { id: 'shoes', label: 'Cipő' },
  { id: 'accessories', label: 'Kiegészítők' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'other', label: 'Egyéb' },
] as const;

export const OTHER_BRAND = 'Egyéb';

/** Nyers márkalista — a publikus export mindig ABC sorrendű (Egyéb a végén). */
const VINTED_BRANDS_RAW = [
  'Adidas',
  'Apple',
  'Asics',
  'Bershka',
  'Birkenstock',
  'Brooks',
  'C&A',
  'Calvin Klein',
  'Champion',
  'Columbia',
  'Converse',
  'COS',
  'Crocs',
  'Cropp',
  'Diesel',
  'Dr. Martens',
  'Ellesse',
  'Esprit',
  'Fila',
  'Guess',
  'H&M',
  'Hoka',
  'House',
  'Hugo Boss',
  'Jack Wolfskin',
  'Kappa',
  'KiK',
  'Lacoste',
  'Levi\'s',
  'Lonsdale',
  'Mango',
  'Massimo Dutti',
  'Michael Kors',
  'Mizuno',
  'Mohito',
  'Napapijri',
  'New Balance',
  'New Yorker',
  'Nike',
  'On',
  'ONLY',
  'Orsay',
  'Patagonia',
  'Primark',
  'Pull&Bear',
  'Puma',
  'Ralph Lauren',
  'Reebok',
  'Regatta',
  'Reserved',
  'Salomon',
  'Samsung',
  'Saucony',
  'Selected',
  'Sinsay',
  'Skechers',
  'Sony',
  'Stradivarius',
  'The North Face',
  'Timberland',
  'Tommy Hilfiger',
  'UGG',
  'Under Armour',
  'Uniqlo',
  'Vans',
  'Vero Moda',
  'Xiaomi',
  'Zara',
  OTHER_BRAND,
] as const;

/** ABC sorrend (hu locale); „Egyéb” mindig utolsó. */
export function sortCatalogBrands(brands: readonly string[]): string[] {
  const rest = brands.filter((b) => b !== OTHER_BRAND);
  rest.sort((a, b) => a.localeCompare(b, 'hu', { sensitivity: 'base' }));
  return brands.includes(OTHER_BRAND) ? [...rest, OTHER_BRAND] : rest;
}

export const VINTED_BRANDS: readonly string[] = sortCatalogBrands(VINTED_BRANDS_RAW);

export function vintedBrandSelectOptions(): { value: string; label: string }[] {
  return VINTED_BRANDS.map((b) => ({ value: b, label: b }));
}

/** Keresés normalizálás — ékezet- és kis/nagybetű független szűrés. */
export function normalizeBrandQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Typeahead szűrés a feltöltés márkaválasztójához — prefix találatok elöl. */
export function filterVintedBrands(query: string, limit = 16): string[] {
  const q = normalizeBrandQuery(query);
  if (!q) return VINTED_BRANDS.slice(0, limit);

  const matches: { brand: string; rank: number }[] = [];
  for (const brand of VINTED_BRANDS) {
    const normalized = normalizeBrandQuery(brand);
    if (!normalized.includes(q)) continue;
    matches.push({ brand, rank: normalized.startsWith(q) ? 0 : 1 });
  }

  matches.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.brand.localeCompare(b.brand, 'hu', { sensitivity: 'base' });
  });

  return matches.slice(0, limit).map((m) => m.brand);
}

export function brandMatchesCatalog(value: string): boolean {
  const n = normalizeBrandQuery(value);
  return VINTED_BRANDS.some((b) => normalizeBrandQuery(b) === n);
}

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
