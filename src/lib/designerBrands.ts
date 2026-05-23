/** Dizájner / prémium márkák — feed „Dizájner” chip szűréshez. */
const DESIGNER_BRANDS = [
  'gucci',
  'prada',
  'louis vuitton',
  'lv',
  'chanel',
  'hermes',
  'hermès',
  'dior',
  'burberry',
  'balenciaga',
  'saint laurent',
  'yves saint laurent',
  'ysl',
  'versace',
  'fendi',
  'bottega veneta',
  'valentino',
  'celine',
  'givenchy',
  'moncler',
  'off-white',
  'off white',
  'loewe',
  'miu miu',
  'tom ford',
  'alexander mcqueen',
  'jacquemus',
  'coach',
  'michael kors',
  'armani',
  'dolce gabbana',
  'dolce & gabbana',
  'moschino',
  'kenzo',
  'acne studios',
  'isabel marant',
  'max mara',
  'the row',
  'zimmermann',
  'self-portrait',
  'ganni',
  'sandro',
  'maje',
  'ba&sh',
  'tory burch',
  'kate spade',
  'mulberry',
  'chloe',
  'chloé',
  'balmain',
  'lanvin',
  'marni',
  'proenza schouler',
  'stella mccartney',
  'vivienne westwood',
  'comme des garcons',
  'comme des garçons',
  'supreme',
  'palm angels',
  'golden goose',
  'canada goose',
  'patagonia',
  'arc teryx',
  "arc'teryx",
] as const;

function normalizeBrand(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function productMatchesDesignerBrand(brand: string | null | undefined): boolean {
  const normalized = normalizeBrand(brand);
  if (!normalized) return false;
  return DESIGNER_BRANDS.some((designer) => {
    const d = normalizeBrand(designer);
    return normalized === d || normalized.includes(d) || d.includes(normalized);
  });
}
