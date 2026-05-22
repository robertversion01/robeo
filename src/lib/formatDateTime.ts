/** Fix locale/időzóna — SSR és kliens ugyanazt adja, elkerüli a hydration #418-et. */

export const DEFAULT_TIME_LOCALE = 'hu-HU';
export const DEFAULT_DATE_LOCALE = 'hu-HU';

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Budapest',
};

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'Europe/Budapest',
};

export function formatTimeIso(iso: string, locale = DEFAULT_TIME_LOCALE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(locale, TIME_OPTS).format(date);
}

export function formatDateIso(iso: string, locale = DEFAULT_DATE_LOCALE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, DATE_OPTS).format(date);
}
