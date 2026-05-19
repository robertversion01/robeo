export const APP_VERSION_STORAGE_KEY = 'robeo-ui-version';

export type AppUiVersion = 'v1' | 'v2';

/** v2 csak lokális fejlesztésben / explicit envvel — nem párhuzamos éles termék. */
export function isV2PreviewEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_V2_PREVIEW === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

export function readStoredAppVersion(): AppUiVersion {
  if (!isV2PreviewEnabled()) return 'v1';
  if (typeof window === 'undefined') return 'v1';
  try {
    const v = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    return v === 'v2' ? 'v2' : 'v1';
  } catch {
    return 'v1';
  }
}

export function writeStoredAppVersion(v: AppUiVersion): void {
  try {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, v);
  } catch {
    /* ignore quota / private mode */
  }
}
