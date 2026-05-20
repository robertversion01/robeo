'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { X, Plus, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import CustomSelect from '@/components/ui/CustomSelect';
import { VINTED_BRANDS, VINTED_CATEGORIES, sizesForCategory } from '@/lib/vintedCatalog';
import { MAIN_TOP_PADDING, STICKY_ACTION_BAR_CLASS } from '@/lib/layoutTokens';
import { revalidateCatalog } from '@/app/actions/revalidateCatalog';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';
import { clearUploadDraft, loadUploadDraft, saveUploadDraft } from '@/lib/uploadDraft';
import { cn } from '@/lib/utils';

const STEPS = ['photos', 'category', 'brand', 'condition', 'price', 'details'] as const;
type StepId = (typeof STEPS)[number];

interface UploadedImage {
  file: File;
  preview: string;
  id: string;
}

type FormState = {
  name: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  brand: string;
  size: string;
};

const emptyForm: FormState = {
  name: '',
  description: '',
  price: '',
  category: '',
  condition: '',
  brand: '',
  size: '',
};

export default function UploadWizard() {
  const { t } = useTranslation();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepId = STEPS[stepIndex];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const persistDraft = useCallback(() => {
    saveUploadDraft({
      step: stepIndex,
      ...formData,
      images: images.map(({ id, preview }) => ({ id, preview })),
    });
  }, [stepIndex, formData, images]);

  useEffect(() => {
    const draft = loadUploadDraft();
    if (!draft || draftRestored) return;
    setFormData({
      name: draft.name || '',
      description: draft.description || '',
      price: draft.price || '',
      category: draft.category || '',
      condition: draft.condition || '',
      brand: draft.brand || '',
      size: draft.size || '',
    });
    if (draft.step >= 0 && draft.step < STEPS.length) {
      setStepIndex(draft.step);
    }
    setDraftRestored(true);
    toast.message(t('uploadWizard.draftRestored'));
  }, [draftRestored, t]);

  useEffect(() => {
    if (!draftRestored && stepIndex === 0 && images.length === 0) return;
    persistDraft();
  }, [persistDraft, draftRestored, stepIndex, formData, images]);

  const stepLabels = useMemo(
    () =>
      STEPS.map((id) => ({
        id,
        label: t(`uploadWizard.steps.${id}`),
      })),
    [t],
  );

  const validateStep = (id: StepId): string | null => {
    switch (id) {
      case 'photos':
        if (images.length === 0) return t('uploadWizard.errors.photosRequired');
        return null;
      case 'category':
        if (!formData.category) return t('uploadWizard.errors.categoryRequired');
        if (!formData.size) return t('uploadWizard.errors.sizeRequired');
        return null;
      case 'brand':
        if (!formData.brand) return t('uploadWizard.errors.brandRequired');
        return null;
      case 'condition':
        if (!formData.condition) return t('uploadWizard.errors.conditionRequired');
        return null;
      case 'price': {
        const p = parseInt(formData.price, 10);
        if (!Number.isFinite(p) || p <= 0) return t('uploadWizard.errors.priceRequired');
        return null;
      }
      case 'details':
        if (!formData.name.trim()) return t('uploadWizard.errors.nameRequired');
        if (!formData.description.trim()) return t('uploadWizard.errors.descriptionRequired');
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const err = validateStep(stepId);
    if (err) {
      toast.error(err);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const maxImages = 6;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(t('upload.maxImages', { max: maxImages }));
      return;
    }
    const newFiles = Array.from(e.target.files).slice(0, remaining);
    newFiles.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(t('upload.notImage', { name: file.name }));
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [
          ...prev,
          { file, preview: ev.target?.result as string, id: Math.random().toString(36).slice(2) },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (imageId: string) => setImages((prev) => prev.filter((img) => img.id !== imageId));

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const image of images) {
      const fileExt = image.file.name.split('.').pop();
      const fileName = `${userId}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, image.file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  const handlePublish = async () => {
    for (const id of STEPS) {
      const err = validateStep(id);
      if (err) {
        toast.error(err);
        setStepIndex(STEPS.indexOf(id));
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('upload.loginRequired'));

      const imageUrls = images.length > 0 ? await uploadImages(user.id) : [];

      const { error } = await supabase.from('products').insert({
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseInt(formData.price, 10),
        category: formData.category,
        condition: formData.condition,
        brand: formData.brand,
        size: formData.size || null,
        image_url: imageUrls[0] || null,
        images: imageUrls,
        user_id: user.id,
        status: 'active',
      });

      if (error) throw error;

      try {
        await revalidateCatalog();
      } catch {
        /* non-fatal */
      }
      notifyCatalogUpdated();
      clearUploadDraft();
      toast.success(t('upload.success'));
      window.location.href = '/';
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      toast.error(t('upload.error') + (msg ? ` ${msg}` : ''));
    } finally {
      setLoading(false);
    }
  };

  const conditionOptions = [
    { value: 'new', label: t('upload.conditions.new') },
    { value: 'excellent', label: t('upload.conditions.excellent') },
    { value: 'good', label: t('upload.conditions.good') },
    { value: 'fair', label: t('upload.conditions.fair') },
    { value: 'poor', label: t('upload.conditions.poor') },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className={`${MAIN_TOP_PADDING} pb-36 max-w-lg mx-auto px-4`}>
        <div className="pt-3 mb-4">
          <h1 className="text-xl font-bold">{t('uploadWizard.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('uploadWizard.subtitle')}</p>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
            <span>
              {t('uploadWizard.stepOf', { current: stepIndex + 1, total: STEPS.length })}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-[#007782] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto no-scrollbar">
            {stepLabels.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  i === stepIndex
                    ? 'bg-[#007782] text-white'
                    : i < stepIndex
                      ? 'bg-[#007782]/15 text-[#007782]'
                      : 'bg-gray-100 text-gray-400',
                )}
              >
                {i < stepIndex ? <Check size={10} className="inline" /> : null} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm min-h-[280px]">
          {stepId === 'photos' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{t('uploadWizard.photosHint')}</p>
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
                    >
                      <img src={image.preview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                        <button type="button" onClick={() => moveImage(index, 'up')} disabled={index === 0} className="p-1 rounded-full bg-white/30 text-white disabled:opacity-30">
                          <ArrowUp size={14} />
                        </button>
                        <button type="button" onClick={() => moveImage(index, 'down')} disabled={index === images.length - 1} className="p-1 rounded-full bg-white/30 text-white disabled:opacity-30">
                          <ArrowDown size={14} />
                        </button>
                      </div>
                      <button type="button" onClick={() => removeImage(image.id)} className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white">
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[9px] bg-black/50 text-white px-1 rounded">{index + 1}</span>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#007782] bg-gray-50 touch-manipulation"
                >
                  <Plus size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium">{t('upload.tapToSelect')}</p>
                  <p className="text-xs text-gray-500 mt-1">{t('upload.imagesCount', { count: images.length })}</p>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
            </div>
          )}

          {stepId === 'category' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium">{t('upload.category')}</label>
              <CustomSelect
                options={VINTED_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                value={formData.category}
                onChange={(val) => setFormData((p) => ({ ...p, category: val, size: '' }))}
                placeholder={t('upload.categoryPlaceholder')}
              />
              <label className="block text-sm font-medium">{t('upload.size')}</label>
              <CustomSelect
                options={sizesForCategory(formData.category || 'clothing').map((s) => ({ value: s, label: s }))}
                value={formData.size}
                onChange={(val) => setFormData((p) => ({ ...p, size: val }))}
                placeholder={t('upload.sizePlaceholder')}
              />
            </div>
          )}

          {stepId === 'brand' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('upload.brand')}</label>
              <CustomSelect
                options={VINTED_BRANDS.map((b) => ({ value: b, label: b }))}
                value={formData.brand}
                onChange={(val) => setFormData((p) => ({ ...p, brand: val }))}
                placeholder={t('upload.brandPlaceholder')}
              />
            </div>
          )}

          {stepId === 'condition' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('upload.condition')}</label>
              <CustomSelect
                options={conditionOptions}
                value={formData.condition}
                onChange={(val) => setFormData((p) => ({ ...p, condition: val }))}
                placeholder={t('upload.conditionPlaceholder')}
              />
            </div>
          )}

          {stepId === 'price' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('upload.price')}</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                placeholder={t('upload.pricePlaceholder')}
                className="input-base w-full text-center text-2xl font-bold tabular-nums"
              />
            </div>
          )}

          {stepId === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t('upload.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t('upload.namePlaceholder')}
                  className="input-base w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('upload.description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('upload.descriptionPlaceholder')}
                  rows={5}
                  className="textarea-base w-full resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            clearUploadDraft();
            setFormData(emptyForm);
            setImages([]);
            setStepIndex(0);
            toast.message(t('uploadWizard.draftCleared'));
          }}
          className="mt-3 text-xs text-gray-500 hover:text-[#007782] underline"
        >
          {t('uploadWizard.clearDraft')}
        </button>
      </main>

      <div className={STICKY_ACTION_BAR_CLASS}>
        <div className="max-w-lg mx-auto flex gap-3">
          {stepIndex > 0 ? (
            <button type="button" onClick={goBack} disabled={loading} className="flex-1 btn-base btn-secondary min-h-12 inline-flex items-center justify-center gap-1">
              <ChevronLeft size={18} />
              {t('uploadWizard.back')}
            </button>
          ) : (
            <button type="button" onClick={() => router.push('/browse')} className="flex-1 btn-base btn-secondary min-h-12">
              {t('uploadWizard.cancel')}
            </button>
          )}
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="flex-[2] btn-base btn-primary min-h-12 inline-flex items-center justify-center gap-1">
              {t('uploadWizard.next')}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={() => void handlePublish()} disabled={loading} className="flex-[2] btn-base btn-primary min-h-12 disabled:opacity-50">
              {loading ? t('upload.submitting') : t('uploadWizard.publish')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
