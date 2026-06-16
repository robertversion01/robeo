'use client';

import { useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type DefectImage = {
  file: File;
  preview: string;
  id: string;
};

type Props = {
  images: DefectImage[];
  onChange: (images: DefectImage[]) => void;
  visible: boolean;
};

export default function DefectPhotoUpload({ images, onChange, visible }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!visible) return null;

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
      <p className="text-xs font-medium text-amber-900">{t('upload.defectPhotos.hint')}</p>
      {images.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.preview} alt="" loading="lazy" decoding="async" className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((i) => i.id !== img.id))}
                className="absolute -right-1 -top-1 rounded-full bg-black/70 p-0.5 text-white"
                aria-label={t('upload.defectPhotos.remove')}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {images.length < 2 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-dashed border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900"
        >
          {t('upload.defectPhotos.add')}
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            onChange([
              ...images,
              {
                file,
                preview: ev.target?.result as string,
                id: Math.random().toString(36).slice(2),
              },
            ].slice(0, 2));
          };
          reader.readAsDataURL(file);
          if (e.target) e.target.value = '';
        }}
      />
    </div>
  );
}

export function conditionNeedsDefectPhoto(condition: string): boolean {
  return condition === 'fair' || condition === 'poor';
}
