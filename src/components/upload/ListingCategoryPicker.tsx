'use client';

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import CustomSelect from '@/components/ui/CustomSelect';
import {
  type ListingType,
  getDepartmentsForListingType,
  getSubcategoriesForTaxonomyDepartment,
  sizesForTaxonomy,
  VINTED_COLORS,
  categoryRequiresSize,
} from '@/lib/marketplaceTaxonomy';

type Props = {
  listingType: ListingType;
  onListingTypeChange: (type: ListingType) => void;
  departmentId: string;
  onDepartmentChange: (id: string) => void;
  subcategoryId: string;
  onSubcategoryChange: (id: string) => void;
  size: string;
  onSizeChange: (size: string) => void;
  color: string;
  onColorChange: (color: string) => void;
};

export default function ListingCategoryPicker({
  listingType,
  onListingTypeChange,
  departmentId,
  onDepartmentChange,
  subcategoryId,
  onSubcategoryChange,
  size,
  onSizeChange,
  color,
  onColorChange,
}: Props) {
  const { t } = useTranslation();
  const departments = getDepartmentsForListingType(listingType);
  const subcategories = departmentId ? getSubcategoriesForTaxonomyDepartment(departmentId) : [];
  const sizes = departmentId
    ? sizesForTaxonomy(departmentId, subcategoryId || 'all').map((s) => ({ value: s, label: s }))
    : [];

  const handleTypeChange = (type: ListingType) => {
    onListingTypeChange(type);
    onDepartmentChange('');
    onSubcategoryChange('');
    onSizeChange('');
    onColorChange('');
  };

  const handleDepartmentChange = (id: string) => {
    onDepartmentChange(id);
    onSubcategoryChange('');
    onSizeChange('');
  };

  return (
    <div className="space-y-5">
      {/* Termék / szolgáltatás váltó */}
      <div>
        <p className="text-sm font-medium mb-2">{t('upload.listingTypeLabel')}</p>
        <div className="grid grid-cols-2 gap-2">
          {(['product', 'service'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={cn(
                'rounded-xl border-2 px-3 py-3 text-sm font-semibold transition touch-manipulation',
                listingType === type
                  ? 'border-[#007782] bg-[#007782]/10 text-[#007782]'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-[#007782]/30',
              )}
            >
              {t(`upload.listingType.${type}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Fő kategória — kompakt rács */}
      <div>
        <p className="text-sm font-medium mb-2">{t('upload.departmentLabel')}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {departments.map((dept) => (
            <button
              key={dept.id}
              type="button"
              onClick={() => handleDepartmentChange(dept.id)}
              className={cn(
                'rounded-xl border px-2.5 py-2.5 text-xs font-semibold text-left transition touch-manipulation leading-tight',
                departmentId === dept.id
                  ? 'border-[#007782] bg-[#007782] text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#007782]/40',
              )}
            >
              {t(dept.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Alkategória — chip sor */}
      {departmentId && subcategories.length > 0 ? (
        <div>
          <p className="text-sm font-medium mb-2">{t('upload.subcategoryLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  onSubcategoryChange(sub.id);
                  onSizeChange('');
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition touch-manipulation',
                  subcategoryId === sub.id
                    ? 'border-[#007782] bg-[#007782] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#007782]/30',
                )}
              >
                {t(sub.labelKey)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Méret + szín — csak termékeknél */}
      {categoryRequiresSize(listingType) && subcategoryId ? (
        <>
          <div>
            <label className="block text-sm font-medium mb-2">{t('upload.size')}</label>
            <CustomSelect
              options={sizes}
              value={size}
              onChange={onSizeChange}
              placeholder={t('upload.sizePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('upload.color')}</label>
            <CustomSelect
              options={VINTED_COLORS.map((c) => ({
                value: c.id,
                label: t(c.labelKey),
              }))}
              value={color}
              onChange={onColorChange}
              placeholder={t('upload.colorPlaceholder')}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
