/** VAPID Web Push — szerver-only private kulcs + publikus kulcs (NEXT_PUBLIC_). */

export function isWebPushConfigured(): boolean {
  const pub =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim();
  return Boolean(pub && process.env.VAPID_PRIVATE_KEY?.trim());
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
}

export function getVapidSubject(): string {
  if (process.env.VAPID_SUBJECT?.trim()) return process.env.VAPID_SUBJECT.trim();
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://robeo.vercel.app';
  try {
    return `mailto:notify@${new URL(base).hostname}`;
  } catch {
    return 'mailto:notify@robeo.vercel.app';
  }
}
