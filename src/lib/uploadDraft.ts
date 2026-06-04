export type UploadDraft = {
  version: 2;
  step: number;
  name: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  brand: string;
  size: string;
  /** Csak darabszám — képek nem kerülnek localStorage-ba (mobil quota / parse crash). */
  imageCount: number;
  /** RobeoBP only — egyébként üres string. Opcionális marad a back-compat miatt. */
  budapestDistrict?: string;
  savedAt: string;
};

const STORAGE_KEY = 'robeo_upload_draft_v2';
const LEGACY_KEYS = ['robeo_upload_draft_v1'];

/** Régi base64 draftok törlése — mobilon a JSON.parse is összeomolhatott. */
export function purgeCorruptUploadDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    if (raw.length > 250_000 || raw.includes('data:image') || raw.includes('"preview"')) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function normalizeDraft(parsed: Record<string, unknown>): UploadDraft | null {
  const version = parsed?.version;
  if (version !== 2 && version !== 1) return null;

  const legacyImages = parsed.images;
  const imageCount =
    typeof parsed.imageCount === 'number'
      ? parsed.imageCount
      : Array.isArray(legacyImages)
        ? legacyImages.length
        : 0;

  return {
    version: 2,
    step: typeof parsed.step === 'number' ? parsed.step : 0,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    description: typeof parsed.description === 'string' ? parsed.description : '',
    price: typeof parsed.price === 'string' ? parsed.price : '',
    category: typeof parsed.category === 'string' ? parsed.category : '',
    condition: typeof parsed.condition === 'string' ? parsed.condition : '',
    brand: typeof parsed.brand === 'string' ? parsed.brand : '',
    size: typeof parsed.size === 'string' ? parsed.size : '',
    imageCount,
    budapestDistrict:
      typeof parsed.budapestDistrict === 'string' ? parsed.budapestDistrict : '',
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
  };
}

export function loadUploadDraft(): UploadDraft | null {
  if (typeof window === 'undefined') return null;
  purgeCorruptUploadDrafts();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 250_000) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeDraft(parsed);
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function saveUploadDraft(draft: Omit<UploadDraft, 'version' | 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  const payload: UploadDraft = {
    ...draft,
    version: 2,
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* QuotaExceededError */
  }
}

export function clearUploadDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
