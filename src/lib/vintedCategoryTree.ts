/**
 * Vinted-szerű kategória-fa — fő kategória (department) + alkategóriák.
 * A DB `products.category` szabad szöveg; aliasokkal illesztünk.
 */

export type VintedSubcategory = {
  id: string;
  labelKey: string;
  dbAliases: string[];
};

export type VintedDepartment = {
  id: string;
  labelKey: string;
  subcategories: VintedSubcategory[];
};

function sub(id: string, labelKey: string, aliases: string[]): VintedSubcategory {
  return { id, labelKey, dbAliases: [id, ...aliases] };
}

const WOMEN_CLOTHING = [
  sub('women_dresses', 'browse.subcategories.women_dresses', ['dress', 'dresses', 'ruha', 'ruhak']),
  sub('women_tops', 'browse.subcategories.women_tops', ['top', 'tops', 'tshirt', 't-shirt', 'blouse', 'polo']),
  sub('women_jumpers', 'browse.subcategories.women_jumpers', ['jumper', 'sweater', 'knit', 'pulover', 'pulóver']),
  sub('women_outerwear', 'browse.subcategories.women_outerwear', ['jacket', 'coat', 'outerwear', 'kabat', 'kabát']),
  sub('women_pants', 'browse.subcategories.women_pants', ['pants', 'trousers', 'jeans', 'nadrag', 'nadrág']),
  sub('women_skirts', 'browse.subcategories.women_skirts', ['skirt', 'skirts', 'szoknya']),
  sub('women_activewear', 'browse.subcategories.women_activewear', ['activewear', 'sportswear', 'leggings']),
  sub('women_swimwear', 'browse.subcategories.women_swimwear', ['swimwear', 'bikini', 'furdoruha']),
  sub('women_lingerie', 'browse.subcategories.women_lingerie', ['lingerie', 'underwear', 'fehernemu']),
  sub('women_shoes', 'browse.subcategories.women_shoes', ['shoes', 'shoe', 'cipo', 'cipő', 'sneakers', 'boots']),
  sub('women_bags', 'browse.subcategories.women_bags', ['bag', 'bags', 'handbag', 'taska', 'táska']),
  sub('women_accessories', 'browse.subcategories.women_accessories', ['accessories', 'accessory', 'jewelry', 'ekszerek']),
  sub('women_beauty', 'browse.subcategories.women_beauty', ['beauty', 'makeup', 'cosmetics', 'szepsegapolas']),
];

const MEN_CLOTHING = [
  sub('men_tops', 'browse.subcategories.men_tops', ['top', 'tshirt', 't-shirt', 'shirt', 'ing']),
  sub('men_jumpers', 'browse.subcategories.men_jumpers', ['jumper', 'sweater', 'hoodie', 'pulover']),
  sub('men_outerwear', 'browse.subcategories.men_outerwear', ['jacket', 'coat', 'kabat', 'kabát']),
  sub('men_pants', 'browse.subcategories.men_pants', ['pants', 'trousers', 'jeans', 'nadrag']),
  sub('men_activewear', 'browse.subcategories.men_activewear', ['activewear', 'sportswear']),
  sub('men_shoes', 'browse.subcategories.men_shoes', ['shoes', 'shoe', 'cipo', 'cipő', 'sneakers']),
  sub('men_accessories', 'browse.subcategories.men_accessories', ['accessories', 'belt', 'hat', 'sapka']),
];

const KIDS = [
  sub('kids_clothing', 'browse.subcategories.kids_clothing', ['kids', 'children', 'gyerek', 'babaruha']),
  sub('kids_shoes', 'browse.subcategories.kids_shoes', ['kids_shoes', 'children_shoes']),
  sub('kids_toys', 'browse.subcategories.kids_toys', ['toys', 'toy', 'jatek', 'játék']),
  sub('kids_baby', 'browse.subcategories.kids_baby', ['baby', 'babakocsi', 'babakellék']),
];

const HOME = [
  sub('home_textiles', 'browse.subcategories.home_textiles', ['textile', 'bedding', 'agynemu', 'agynemű']),
  sub('home_decor', 'browse.subcategories.home_decor', ['decor', 'decoration', 'dekoracio']),
  sub('home_kitchen', 'browse.subcategories.home_kitchen', ['kitchen', 'konyha', 'edenyek']),
  sub('home_furniture', 'browse.subcategories.home_furniture', ['furniture', 'butor', 'bútor']),
];

const ELECTRONICS = [
  sub('electronics_phones', 'browse.subcategories.electronics_phones', ['phone', 'mobile', 'telefon']),
  sub('electronics_computers', 'browse.subcategories.electronics_computers', ['computer', 'laptop', 'pc', 'szamitogep']),
  sub('electronics_gaming', 'browse.subcategories.electronics_gaming', ['gaming', 'console', 'jatek_konzol']),
  sub('electronics_audio', 'browse.subcategories.electronics_audio', ['audio', 'headphones', 'fejhallgato']),
  sub('electronics_photo', 'browse.subcategories.electronics_photo', ['camera', 'photo', 'fenykepezogep']),
];

const ENTERTAINMENT = [
  sub('entertainment_books', 'browse.subcategories.entertainment_books', ['books', 'book', 'konyv', 'könyv']),
  sub('entertainment_games', 'browse.subcategories.entertainment_games', ['games', 'boardgame', 'tarsasjatek']),
  sub('entertainment_music', 'browse.subcategories.entertainment_music', ['music', 'vinyl', 'cd', 'zene']),
  sub('entertainment_hobbies', 'browse.subcategories.entertainment_hobbies', ['hobby', 'craft', 'kezmuves']),
];

const SPORTS = [
  sub('sports_clothing', 'browse.subcategories.sports_clothing', ['sport', 'sports', 'sportruha']),
  sub('sports_equipment', 'browse.subcategories.sports_equipment', ['equipment', 'felszereles', 'bike', 'bicikli']),
  sub('sports_outdoor', 'browse.subcategories.sports_outdoor', ['outdoor', 'camping', 'tura']),
];

const PETS = [
  sub('pets_dogs', 'browse.subcategories.pets_dogs', ['dog', 'kutya']),
  sub('pets_cats', 'browse.subcategories.pets_cats', ['cat', 'macska']),
  sub('pets_other', 'browse.subcategories.pets_other', ['pet', 'allat', 'állat']),
];

/** Régi flat kategóriák → department (visszafelé kompatibilitás). */
export const LEGACY_CATEGORY_TO_DEPARTMENT: Record<string, string> = {
  clothing: 'women',
  shoes: 'women',
  accessories: 'women',
  electronics: 'electronics',
  other: 'other',
  all: 'all',
};

export const VINTED_DEPARTMENTS: VintedDepartment[] = [
  { id: 'women', labelKey: 'browse.departments.women', subcategories: WOMEN_CLOTHING },
  { id: 'men', labelKey: 'browse.departments.men', subcategories: MEN_CLOTHING },
  { id: 'kids', labelKey: 'browse.departments.kids', subcategories: KIDS },
  { id: 'home', labelKey: 'browse.departments.home', subcategories: HOME },
  { id: 'electronics', labelKey: 'browse.departments.electronics', subcategories: ELECTRONICS },
  { id: 'entertainment', labelKey: 'browse.departments.entertainment', subcategories: ENTERTAINMENT },
  { id: 'sports', labelKey: 'browse.departments.sports', subcategories: SPORTS },
  { id: 'pets', labelKey: 'browse.departments.pets', subcategories: PETS },
  {
    id: 'other',
    labelKey: 'browse.departments.other',
    subcategories: [
      sub('other_misc', 'browse.subcategories.other_misc', ['other', 'egyeb', 'egyéb', 'misc']),
    ],
  },
];

const ALL_SUBCATEGORIES = VINTED_DEPARTMENTS.flatMap((d) => d.subcategories);

export function getDepartmentById(id: string): VintedDepartment | undefined {
  return VINTED_DEPARTMENTS.find((d) => d.id === id);
}

export function getSubcategoriesForDepartment(departmentId: string): VintedSubcategory[] {
  if (departmentId === 'all') return [];
  return getDepartmentById(departmentId)?.subcategories ?? [];
}

export function getSubcategoryById(id: string): VintedSubcategory | undefined {
  return ALL_SUBCATEGORIES.find((s) => s.id === id);
}

export function departmentDbAliases(departmentId: string): string[] {
  if (departmentId === 'all') return [];
  const dept = getDepartmentById(departmentId);
  if (!dept) return [departmentId];
  const aliases = new Set<string>([departmentId]);
  for (const sc of dept.subcategories) {
    for (const a of sc.dbAliases) aliases.add(a);
  }
  return [...aliases];
}

export function subcategoryDbAliases(subcategoryId: string): string[] {
  if (subcategoryId === 'all') return [];
  const sc = getSubcategoryById(subcategoryId);
  if (!sc) return [subcategoryId];
  return [...new Set(sc.dbAliases)];
}

export function sizesForDepartment(departmentId: string, subcategoryId: string): readonly string[] {
  const subId = subcategoryId !== 'all' ? subcategoryId : '';
  if (
    subId.includes('shoes') ||
    subId === 'women_shoes' ||
    subId === 'men_shoes' ||
    subId === 'kids_shoes'
  ) {
    return ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', 'Egy méret'];
  }
  if (departmentId === 'kids') {
    return ['56', '62', '68', '74', '80', '86', '92', '98', '104', '110', '116', '122', '128', '134', '140', '146', '152', '158', '164', 'XS', 'S', 'M', 'L', 'XL'];
  }
  if (
    departmentId === 'home' ||
    departmentId === 'electronics' ||
    departmentId === 'entertainment' ||
    departmentId === 'pets'
  ) {
    return ['Egy méret'];
  }
  return ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Egy méret'];
}

export const VINTED_COLORS = [
  { id: 'black', labelKey: 'browse.colors.black', aliases: ['black', 'fekete'] },
  { id: 'white', labelKey: 'browse.colors.white', aliases: ['white', 'feher', 'fehér'] },
  { id: 'gray', labelKey: 'browse.colors.gray', aliases: ['gray', 'grey', 'szurke', 'szürke'] },
  { id: 'beige', labelKey: 'browse.colors.beige', aliases: ['beige', 'bezs'] },
  { id: 'brown', labelKey: 'browse.colors.brown', aliases: ['brown', 'barna'] },
  { id: 'red', labelKey: 'browse.colors.red', aliases: ['red', 'piros'] },
  { id: 'pink', labelKey: 'browse.colors.pink', aliases: ['pink', 'rozsaszin', 'rózsaszín'] },
  { id: 'orange', labelKey: 'browse.colors.orange', aliases: ['orange', 'narancs'] },
  { id: 'yellow', labelKey: 'browse.colors.yellow', aliases: ['yellow', 'sarga', 'sárga'] },
  { id: 'green', labelKey: 'browse.colors.green', aliases: ['green', 'zold', 'zöld'] },
  { id: 'blue', labelKey: 'browse.colors.blue', aliases: ['blue', 'kek', 'kék'] },
  { id: 'purple', labelKey: 'browse.colors.purple', aliases: ['purple', 'lila'] },
  { id: 'multicolor', labelKey: 'browse.colors.multicolor', aliases: ['multicolor', 'multi', 'tobbszinu', 'többszínű'] },
] as const;

export function colorDbAliases(colorId: string): string[] {
  if (colorId === 'all') return [];
  const def = VINTED_COLORS.find((c) => c.id === colorId);
  if (!def) return [colorId];
  return [...def.aliases, colorId];
}

export function productMatchesColor(
  productColor: string | null | undefined,
  filterId: string,
): boolean {
  if (filterId === 'all') return true;
  if (!productColor?.trim()) return false;
  const normalized = normalizeProductCategory(productColor);
  const aliases = colorDbAliases(filterId);
  return aliases.some((a) => {
    const alias = normalizeProductCategory(a);
    return normalized === alias || normalized.includes(alias);
  });
}

export function normalizeProductCategory(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function productMatchesDepartment(
  productCategory: string | null | undefined,
  departmentId: string,
): boolean {
  if (departmentId === 'all') return true;
  const normalized = normalizeProductCategory(productCategory);
  const aliases = departmentDbAliases(departmentId);
  return aliases.some((a) => {
    const alias = normalizeProductCategory(a);
    return normalized === alias || normalized.includes(alias) || alias.includes(normalized);
  });
}

export function productMatchesSubcategory(
  productCategory: string | null | undefined,
  subcategoryId: string,
): boolean {
  if (subcategoryId === 'all') return true;
  const normalized = normalizeProductCategory(productCategory);
  const aliases = subcategoryDbAliases(subcategoryId);
  return aliases.some((a) => {
    const alias = normalizeProductCategory(a);
    return normalized === alias || normalized.includes(alias) || alias.includes(normalized);
  });
}
