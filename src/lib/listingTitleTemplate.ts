import { getDistrictLabel } from '@/lib/budapestDistricts';
import { subcategoryLabel } from '@/lib/categoryDisplay';
import { formatConditionLabel } from '@/lib/conditionI18n';
import type { TFunction } from 'i18next';

export type ListingTemplateInput = {
  brand?: string;
  category?: string;
  subcategoryId?: string;
  size?: string;
  condition?: string;
  price?: string | number;
  budapestDistrict?: string;
  listingType?: 'product' | 'service';
};

/** Determinisztikus cím sablon — nincs AI. */
export function buildListingTitle(input: ListingTemplateInput, t: TFunction): string {
  const parts: string[] = [];
  const brand = input.brand?.trim();
  const size = input.size?.trim();

  if (brand && brand !== 'Egyéb' && brand !== 'Other') parts.push(brand);

  const catLabel =
    input.subcategoryId && input.subcategoryId !== 'all'
      ? subcategoryLabel(t, input.subcategoryId)
      : input.category
        ? t(`browse.categories.${input.category}`, { defaultValue: input.category.replace(/_/g, ' ') })
        : '';

  if (catLabel) parts.push(catLabel);
  if (size) parts.push(size);

  if (parts.length === 0) {
    return input.listingType === 'service'
      ? t('upload.template.defaultServiceTitle')
      : t('upload.template.defaultProductTitle');
  }

  return parts.join(' · ');
}

/** Determinisztikus leírás sablon. */
export function buildListingDescription(input: ListingTemplateInput, t: TFunction): string {
  const lines: string[] = [];
  const title = buildListingTitle(input, t);
  lines.push(title);

  if (input.condition) {
    lines.push(
      `${t('upload.condition')}: ${formatConditionLabel(t, input.condition)}`,
    );
  }

  if (input.size?.trim()) {
    lines.push(`${t('upload.size')}: ${input.size.trim()}`);
  }

  const district = getDistrictLabel(input.budapestDistrict);
  if (district) {
    lines.push(`${t('upload.budapestDistrict')}: ${district}`);
  }

  const price = Number(input.price);
  if (Number.isFinite(price) && price > 0) {
    lines.push(`${t('upload.price')}: ${price.toLocaleString('hu-HU')} Ft`);
  }

  lines.push('');
  lines.push(t('upload.template.descriptionFooter'));

  return lines.filter((l, i, arr) => !(l === '' && arr[i + 1] === '')).join('\n');
}
