export type UploadDraftImage = {
  id: string;
  preview: string;
};

export type UploadDraft = {
  version: 1;
  step: number;
  name: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  brand: string;
  size: string;
  images: UploadDraftImage[];
  savedAt: string;
};

const STORAGE_KEY = 'robeo_upload_draft_v1';

export function loadUploadDraft(): UploadDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UploadDraft;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveUploadDraft(draft: Omit<UploadDraft, 'version' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: UploadDraft = {
    ...draft,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearUploadDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
