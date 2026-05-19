/** Foxpost APT Finder postMessage payload (cdn.foxpost.hu dokumentáció). */
export type FoxpostTerminal = {
  place_id?: number;
  operator_id?: string;
  name?: string;
  address?: string;
  zip?: string;
  city?: string;
  street?: string;
  findme?: string;
  geolat?: number;
  geolng?: number;
  variant?: string;
};

/** Hivatalos APT Finder beágyazás — /app/, nem index.html (az 404-et ad). */
export const FOXPOST_APT_FINDER_URL =
  process.env.NEXT_PUBLIC_FOXPOST_APT_FINDER_URL ||
  'https://cdn.foxpost.hu/apt-finder/v1/app/?noHeader=1';

export const FOXPOST_APT_FINDER_ORIGINS = [
  'https://cdn.foxpost.hu',
  'https://foxpost.hu',
] as const;

export function isFoxpostAptFinderOrigin(origin: string): boolean {
  return (FOXPOST_APT_FINDER_ORIGINS as readonly string[]).includes(origin);
}

export function parseFoxpostTerminalMessage(data: unknown): FoxpostTerminal | null {
  if (!data) return null;
  try {
    const raw = typeof data === 'string' ? JSON.parse(data) : data;
    if (!raw || typeof raw !== 'object') return null;
    const t = raw as FoxpostTerminal;
    if (!t.operator_id && !t.place_id && !t.name) return null;
    return t;
  } catch {
    return null;
  }
}

export function foxpostTerminalId(terminal: FoxpostTerminal): string {
  return String(terminal.operator_id || terminal.place_id || '').trim();
}

export function foxpostTerminalLabel(terminal: FoxpostTerminal): string {
  return terminal.name?.trim() || 'Foxpost automata';
}

export function foxpostTerminalAddress(terminal: FoxpostTerminal): string {
  if (terminal.address?.trim()) return terminal.address.trim();
  const parts = [terminal.zip, terminal.city, terminal.street].filter(Boolean);
  return parts.join(' ').trim() || terminal.findme?.trim() || '';
}
