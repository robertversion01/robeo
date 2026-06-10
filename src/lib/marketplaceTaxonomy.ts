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

/** Szolgáltatás fő kategóriák — Jófogás / FB Marketplace logika, kompakt mobil menü. */
export const SERVICE_DEPARTMENTS: TaxonomyDepartment[] = [
  {
    id: 'svc_home',
    labelKey: 'browse.serviceDepartments.home',
    listingType: 'service',
    subcategories: [
      svcSub('svc_home_cleaning', 'browse.serviceSubcategories.home_cleaning', ['takaritas', 'takarítás', 'cleaning']),
      svcSub('svc_home_repair', 'browse.serviceSubcategories.home_repair', ['javitas', 'javítás', 'repair', 'szerelo']),
      svcSub('svc_home_moving', 'browse.serviceSubcategories.home_moving', ['koltozes', 'költöztetés', 'moving']),
      svcSub('svc_home_garden', 'browse.serviceSubcategories.home_garden', ['kert', 'garden', 'kertesz']),
    ],
  },
  {
    id: 'svc_beauty',
    labelKey: 'browse.serviceDepartments.beauty',
    listingType: 'service',
    subcategories: [
      svcSub('svc_beauty_hair', 'browse.serviceSubcategories.beauty_hair', ['fodrasz', 'fodrász', 'hair']),
      svcSub('svc_beauty_nails', 'browse.serviceSubcategories.beauty_nails', ['manikur', 'köröm', 'nails']),
      svcSub('svc_beauty_massage', 'browse.serviceSubcategories.beauty_massage', ['masszazs', 'masszázs', 'massage']),
      svcSub('svc_beauty_makeup', 'browse.serviceSubcategories.beauty_makeup', ['smink', 'makeup']),
    ],
  },
  {
    id: 'svc_education',
    labelKey: 'browse.serviceDepartments.education',
    listingType: 'service',
    subcategories: [
      svcSub('svc_education_tutoring', 'browse.serviceSubcategories.education_tutoring', ['magantanar', 'magántanár', 'tutor']),
      svcSub('svc_education_language', 'browse.serviceSubcategories.education_language', ['nyelv', 'language', 'angol']),
      svcSub('svc_education_music', 'browse.serviceSubcategories.education_music', ['zeneora', 'zeneóra', 'music lesson']),
    ],
  },
  {
    id: 'svc_it',
    labelKey: 'browse.serviceDepartments.it',
    listingType: 'service',
    subcategories: [
      svcSub('svc_it_repair', 'browse.serviceSubcategories.it_repair', ['szerviz', 'repair', 'laptop']),
      svcSub('svc_it_web', 'browse.serviceSubcategories.it_web', ['web', 'honlap', 'website']),
      svcSub('svc_it_other', 'browse.serviceSubcategories.it_other', ['it', 'informatika']),
    ],
  },
  {
    id: 'svc_creative',
    labelKey: 'browse.serviceDepartments.creative',
    listingType: 'service',
    subcategories: [
      svcSub('svc_creative_photo', 'browse.serviceSubcategories.creative_photo', ['foto', 'fotó', 'photo']),
      svcSub('svc_creative_design', 'browse.serviceSubcategories.creative_design', ['design', 'grafika']),
      svcSub('svc_creative_video', 'browse.serviceSubcategories.creative_video', ['video', 'vlog']),
    ],
  },
  {
    id: 'svc_pets',
    labelKey: 'browse.serviceDepartments.pets',
    listingType: 'service',
    subcategories: [
      svcSub('svc_pets_walking', 'browse.serviceSubcategories.pets_walking', ['setaltatas', 'sétáltatás', 'dog walk']),
      svcSub('svc_pets_grooming', 'browse.serviceSubcategories.pets_grooming', ['apolas', 'ápolás', 'grooming']),
      svcSub('svc_pets_sitting', 'browse.serviceSubcategories.pets_sitting', ['kor', 'őrzés', 'pet sit']),
    ],
  },
  {
    id: 'svc_events',
    labelKey: 'browse.serviceDepartments.events',
    listingType: 'service',
    subcategories: [
      svcSub('svc_events_catering', 'browse.serviceSubcategories.events_catering', ['catering', 'sutemeny', 'sütemény']),
      svcSub('svc_events_dj', 'browse.serviceSubcategories.events_dj', ['dj', 'zene', 'party']),
      svcSub('svc_events_other', 'browse.serviceSubcategories.events_other', ['rendezveny', 'rendezvény', 'event']),
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
