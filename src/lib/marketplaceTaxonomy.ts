/**
 * Egységes marketplace taxonómia — termékek (Vinted-szerű) + szolgáltatások (külön fa).
 * A DB `products.category` mezőbe a kanonikus alkategória ID kerül (pl. women_dresses, svc_home_cleaning).
 */

import {
  VINTED_DEPARTMENTS,
  VINTED_COLORS,
  getDepartmentById,
  getSubcategoriesForDepartment,
  getSubcategoryById,
  sizesForDepartment,
  type VintedDepartment,
  type VintedSubcategory,
} from '@/lib/vintedCategoryTree';

export type ListingType = 'product' | 'service';

export type TaxonomySubcategory = VintedSubcategory;

export type TaxonomyDepartment = {
  id: string;
  labelKey: string;
  subcategories: TaxonomySubcategory[];
  listingType: ListingType;
};

function svcSub(id: string, labelKey: string, aliases: string[] = []): TaxonomySubcategory {
  return { id, labelKey, dbAliases: [id, ...aliases] };
}

/** Szolgáltatás fő kategóriák — beauty / wellness / fitness / otthon (Treatwell, Fresha, Jófogás minták). */
export const SERVICE_DEPARTMENTS: TaxonomyDepartment[] = [
  {
    id: 'svc_beauty',
    labelKey: 'browse.serviceDepartments.beauty',
    listingType: 'service',
    subcategories: [
      svcSub('svc_beauty_hairdresser', 'browse.serviceSubcategories.beauty_hairdresser', ['fodrasz', 'fodrász', 'hairdresser', 'svc_beauty_hair']),
      svcSub('svc_beauty_barber', 'browse.serviceSubcategories.beauty_barber', ['borbely', 'borbély', 'barber']),
      svcSub('svc_beauty_hair_color', 'browse.serviceSubcategories.beauty_hair_color', ['hajfestes', 'hajfestés', 'hair color', 'festes']),
      svcSub('svc_beauty_hair_stylist', 'browse.serviceSubcategories.beauty_hair_stylist', ['hajstylist', 'stylist']),
      svcSub('svc_beauty_manicure', 'browse.serviceSubcategories.beauty_manicure', ['manikur', 'manikűr', 'manicure']),
      svcSub('svc_beauty_pedicure', 'browse.serviceSubcategories.beauty_pedicure', ['pedikur', 'pedikűr', 'pedicure']),
      svcSub('svc_beauty_nails', 'browse.serviceSubcategories.beauty_nails', ['kormos', 'körmös', 'nails', 'gel', 'svc_beauty_nails']),
      svcSub('svc_beauty_cosmetician', 'browse.serviceSubcategories.beauty_cosmetician', ['kozmetikus', 'kozmetika', 'cosmetician']),
      svcSub('svc_beauty_makeup', 'browse.serviceSubcategories.beauty_makeup', ['sminkes', 'smink', 'makeup', 'svc_beauty_makeup']),
      svcSub('svc_beauty_bridal_makeup', 'browse.serviceSubcategories.beauty_bridal_makeup', ['eskuvoi', 'esküvői', 'bridal', 'alkalmi smink']),
      svcSub('svc_beauty_lash', 'browse.serviceSubcategories.beauty_lash', ['szempilla', 'lash', 'extensions']),
      svcSub('svc_beauty_brow', 'browse.serviceSubcategories.beauty_brow', ['szemoldok', 'szemöldök', 'brow', 'laminalas']),
      svcSub('svc_beauty_wax', 'browse.serviceSubcategories.beauty_wax', ['szortelenites', 'szőrtelenítés', 'wax', 'gyantazas']),
      svcSub('svc_beauty_massage', 'browse.serviceSubcategories.beauty_massage', ['masszor', 'masszazs', 'masszázs', 'massage', 'svc_beauty_massage']),
      svcSub('svc_beauty_spa', 'browse.serviceSubcategories.beauty_spa', ['wellness', 'spa', 'relax']),
    ],
  },
  {
    id: 'svc_fitness',
    labelKey: 'browse.serviceDepartments.fitness',
    listingType: 'service',
    subcategories: [
      svcSub('svc_fitness_personal', 'browse.serviceSubcategories.fitness_personal', ['szemelyi edzo', 'személyi edző', 'personal trainer', 'edzo', 'edző']),
      svcSub('svc_fitness_trainer', 'browse.serviceSubcategories.fitness_trainer', ['trener', 'tréner', 'coach']),
      svcSub('svc_fitness_yoga', 'browse.serviceSubcategories.fitness_yoga', ['joga', 'jóga', 'yoga']),
      svcSub('svc_fitness_pilates', 'browse.serviceSubcategories.fitness_pilates', ['pilates']),
      svcSub('svc_fitness_group', 'browse.serviceSubcategories.fitness_group', ['csoportos edzes', 'csoportos edzés', 'group training']),
    ],
  },
  {
    id: 'svc_home',
    labelKey: 'browse.serviceDepartments.home',
    listingType: 'service',
    subcategories: [
      svcSub('svc_home_cleaning', 'browse.serviceSubcategories.home_cleaning', ['takaritas', 'takarítás', 'cleaning', 'takarito']),
      svcSub('svc_home_handyman', 'browse.serviceSubcategories.home_handyman', ['haz koruli', 'ház körüli', 'handyman', 'ezermester']),
      svcSub('svc_home_repair', 'browse.serviceSubcategories.home_repair', ['javitas', 'javítás', 'repair', 'szerelo', 'villany']),
      svcSub('svc_home_moving', 'browse.serviceSubcategories.home_moving', ['koltozes', 'költöztetés', 'moving']),
      svcSub('svc_home_garden', 'browse.serviceSubcategories.home_garden', ['kert', 'garden', 'kertesz', 'kertgondozas']),
    ],
  },
  {
    id: 'svc_education',
    labelKey: 'browse.serviceDepartments.education',
    listingType: 'service',
    subcategories: [
      svcSub('svc_education_tutoring', 'browse.serviceSubcategories.education_tutoring', ['magantanar', 'magántanár', 'tutor']),
      svcSub('svc_education_language', 'browse.serviceSubcategories.education_language', ['nyelv', 'language', 'angol', 'nyelvoktatas']),
      svcSub('svc_education_music', 'browse.serviceSubcategories.education_music', ['zeneora', 'zeneóra', 'music lesson']),
      svcSub('svc_education_babysitter', 'browse.serviceSubcategories.education_babysitter', ['babysitter', 'gyerekfelugyelet', 'bébiszitter', 'babaorzo']),
    ],
  },
  {
    id: 'svc_events',
    labelKey: 'browse.serviceDepartments.events',
    listingType: 'service',
    subcategories: [
      svcSub('svc_events_catering', 'browse.serviceSubcategories.events_catering', ['catering', 'sutemeny', 'sütemény', 'etel']),
      svcSub('svc_events_dj', 'browse.serviceSubcategories.events_dj', ['dj', 'zene', 'party']),
      svcSub('svc_events_photo', 'browse.serviceSubcategories.events_photo', ['esemeny foto', 'esemény fotó', 'event photo']),
      svcSub('svc_events_decor', 'browse.serviceSubcategories.events_decor', ['dekoracio', 'dekoráció', 'decor']),
      svcSub('svc_events_other', 'browse.serviceSubcategories.events_other', ['rendezveny', 'rendezvény', 'event']),
    ],
  },
  {
    id: 'svc_creative',
    labelKey: 'browse.serviceDepartments.creative',
    listingType: 'service',
    subcategories: [
      svcSub('svc_creative_photo', 'browse.serviceSubcategories.creative_photo', ['foto', 'fotó', 'photo', 'fotos']),
      svcSub('svc_creative_design', 'browse.serviceSubcategories.creative_design', ['design', 'grafika', 'grafikus']),
      svcSub('svc_creative_video', 'browse.serviceSubcategories.creative_video', ['video', 'vlog', 'videós']),
    ],
  },
  {
    id: 'svc_pets',
    labelKey: 'browse.serviceDepartments.pets',
    listingType: 'service',
    subcategories: [
      svcSub('svc_pets_walking', 'browse.serviceSubcategories.pets_walking', ['setaltatas', 'sétáltatás', 'dog walk']),
      svcSub('svc_pets_grooming', 'browse.serviceSubcategories.pets_grooming', ['apolas', 'ápolás', 'grooming', 'kutyakozmetika']),
      svcSub('svc_pets_sitting', 'browse.serviceSubcategories.pets_sitting', ['kor', 'őrzés', 'pet sit', 'allatorzo']),
    ],
  },
  {
    id: 'svc_it',
    labelKey: 'browse.serviceDepartments.it',
    listingType: 'service',
    subcategories: [
      svcSub('svc_it_repair', 'browse.serviceSubcategories.it_repair', ['szerviz', 'repair', 'laptop', 'telefon javitas']),
      svcSub('svc_it_web', 'browse.serviceSubcategories.it_web', ['web', 'honlap', 'website']),
      svcSub('svc_it_other', 'browse.serviceSubcategories.it_other', ['it', 'informatika', 'programozas']),
    ],
  },
  {
    id: 'svc_other',
    labelKey: 'browse.serviceDepartments.other',
    listingType: 'service',
    subcategories: [
      svcSub('svc_other_misc', 'browse.serviceSubcategories.other_misc', ['egyeb', 'egyéb', 'other service']),
    ],
  },
];

const PRODUCT_DEPARTMENTS: TaxonomyDepartment[] = VINTED_DEPARTMENTS.map((d) => ({
  id: d.id,
  labelKey: d.labelKey,
  subcategories: d.subcategories,
  listingType: 'product' as const,
}));

const ALL_DEPARTMENTS = [...PRODUCT_DEPARTMENTS, ...SERVICE_DEPARTMENTS];
const ALL_SUBCATEGORIES = ALL_DEPARTMENTS.flatMap((d) => d.subcategories);

export const SERVICE_CATEGORY_PREFIX = 'svc_';

export function isServiceCategory(category: string | null | undefined): boolean {
  if (!category?.trim()) return false;
  return category.trim().startsWith(SERVICE_CATEGORY_PREFIX);
}

export function getListingType(category: string | null | undefined): ListingType {
  return isServiceCategory(category) ? 'service' : 'product';
}

export function getDepartmentsForListingType(type: ListingType | 'all'): TaxonomyDepartment[] {
  if (type === 'service') return SERVICE_DEPARTMENTS;
  if (type === 'product') return PRODUCT_DEPARTMENTS;
  return PRODUCT_DEPARTMENTS;
}

export function getDepartmentByTaxonomyId(id: string): TaxonomyDepartment | undefined {
  return ALL_DEPARTMENTS.find((d) => d.id === id);
}

export function getSubcategoryByTaxonomyId(id: string): TaxonomySubcategory | undefined {
  return ALL_SUBCATEGORIES.find((s) => s.id === id) ?? getSubcategoryById(id);
}

export function getDepartmentForCategory(category: string | null | undefined): string | null {
  if (!category?.trim()) return null;
  const id = category.trim();
  for (const dept of ALL_DEPARTMENTS) {
    if (dept.id === id) return dept.id;
    if (dept.subcategories.some((s) => s.id === id)) return dept.id;
  }
  const legacy = getSubcategoryById(id);
  if (legacy) {
    for (const dept of PRODUCT_DEPARTMENTS) {
      if (dept.subcategories.some((s) => s.id === id)) return dept.id;
    }
  }
  return null;
}

export function departmentDbAliasesForTaxonomy(departmentId: string): string[] {
  const dept = getDepartmentByTaxonomyId(departmentId);
  if (!dept) return [departmentId];
  const aliases = new Set<string>([departmentId]);
  for (const sc of dept.subcategories) {
    for (const a of sc.dbAliases) aliases.add(a);
  }
  return [...aliases];
}

export function subcategoryDbAliasesForTaxonomy(subcategoryId: string): string[] {
  const sc = getSubcategoryByTaxonomyId(subcategoryId);
  if (!sc) return [subcategoryId];
  return [...new Set(sc.dbAliases)];
}

export function normalizeTaxonomyCategory(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function productMatchesTaxonomyDepartment(
  productCategory: string | null | undefined,
  departmentId: string,
): boolean {
  if (departmentId === 'all') return true;
  const normalized = normalizeTaxonomyCategory(productCategory);
  if (!normalized) return false;

  const dept = getDepartmentByTaxonomyId(departmentId);
  if (!dept) return normalized === normalizeTaxonomyCategory(departmentId);

  if (dept.listingType === 'service') {
    if (!isServiceCategory(productCategory)) return false;
  } else if (isServiceCategory(productCategory)) {
    return false;
  }

  const aliases = departmentDbAliasesForTaxonomy(departmentId);
  return aliases.some((a) => {
    const alias = normalizeTaxonomyCategory(a);
    return normalized === alias || normalized.includes(alias) || alias.includes(normalized);
  });
}

export function productMatchesTaxonomySubcategory(
  productCategory: string | null | undefined,
  subcategoryId: string,
): boolean {
  if (subcategoryId === 'all') return true;
  const normalized = normalizeTaxonomyCategory(productCategory);
  const aliases = subcategoryDbAliasesForTaxonomy(subcategoryId);
  return aliases.some((a) => {
    const alias = normalizeTaxonomyCategory(a);
    return normalized === alias || normalized.includes(alias) || alias.includes(normalized);
  });
}

export function productMatchesListingTypeFilter(
  productCategory: string | null | undefined,
  listingType: 'all' | ListingType,
): boolean {
  if (listingType === 'all') return true;
  const isService = isServiceCategory(productCategory);
  return listingType === 'service' ? isService : !isService;
}

export function sizesForTaxonomy(departmentId: string, subcategoryId: string): readonly string[] {
  if (departmentId.startsWith(SERVICE_CATEGORY_PREFIX) || subcategoryId.startsWith(SERVICE_CATEGORY_PREFIX)) {
    return ['Egy méret'];
  }
  return sizesForDepartment(departmentId, subcategoryId);
}

export function categoryRequiresSize(listingType: ListingType): boolean {
  return listingType === 'product';
}

export function categoryRequiresBrand(listingType: ListingType): boolean {
  return listingType === 'product';
}

export function categoryRequiresCondition(listingType: ListingType): boolean {
  return listingType === 'product';
}

export function getSubcategoriesForTaxonomyDepartment(departmentId: string): TaxonomySubcategory[] {
  if (departmentId === 'all' || !departmentId) return [];
  const dept = getDepartmentByTaxonomyId(departmentId);
  return dept?.subcategories ?? [];
}

export { VINTED_COLORS, PRODUCT_DEPARTMENTS };
export type { VintedDepartment };
