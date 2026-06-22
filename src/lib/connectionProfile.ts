export type ConnectionProfile = 'fast' | 'moderate' | 'slow';

/** Network Information API + save-data — mobilon lassú hálózaton kisebb képek. */
export function getConnectionProfile(): ConnectionProfile {
  if (typeof navigator === 'undefined') return 'fast';
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  const conn = nav.connection;
  if (conn?.saveData) return 'slow';
  const et = conn?.effectiveType ?? '';
  if (et === 'slow-2g' || et === '2g') return 'slow';
  if (et === '3g') return 'moderate';
  return 'fast';
}

/** Kép presetekhez — mobilon óvatosabb (cellular decode + gyorsabb paint). */
export function getImageConnectionProfile(): ConnectionProfile {
  const network = getConnectionProfile();
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    if (network === 'fast') return 'moderate';
    if (network === 'moderate') return 'slow';
  }
  return network;
}

export function scaleWidthForConnection(width: number, profile: ConnectionProfile): number {
  if (profile === 'slow') return Math.max(120, Math.round(width * 0.7));
  if (profile === 'moderate') return Math.max(140, Math.round(width * 0.85));
  return width;
}

export function scaleQualityForConnection(quality: number, profile: ConnectionProfile): number {
  if (profile === 'slow') return Math.max(48, quality - 12);
  if (profile === 'moderate') return Math.max(52, quality - 6);
  return quality;
}
