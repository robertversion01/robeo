/** Packeta / Z-BOX átvételi pont — widget callback vagy statikus lista. */
export type PacketaPoint = {
  id: string;
  name: string;
  address?: string;
  street?: string;
  city?: string;
  zip?: string;
};

/** Packeta Point Picker widget (widget.packeta.com) — opcionális, env kulccsal. */
export const PACKETA_WIDGET_SCRIPT = 'https://widget.packeta.com/v6/www/js/library.js';

export function packetaPointId(point: PacketaPoint): string {
  return String(point.id || '').trim();
}

export function packetaPointLabel(point: PacketaPoint): string {
  return point.name?.trim() || 'Packeta pont';
}

export function packetaPointAddress(point: PacketaPoint): string {
  if (point.address?.trim()) return point.address.trim();
  const parts = [point.zip, point.city, point.street].filter(Boolean);
  return parts.join(' ').trim();
}

export function parsePacketaWidgetPoint(raw: unknown): PacketaPoint | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = String(p.id ?? '').trim();
  const name = String(p.name ?? '').trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    street: typeof p.street === 'string' ? p.street : undefined,
    city: typeof p.city === 'string' ? p.city : undefined,
    zip: typeof p.zip === 'string' ? p.zip : undefined,
    address: typeof p.place === 'string' ? p.place : undefined,
  };
}

/** Gyakori HU Packeta / Z-BOX pontok — dev fallback widget API kulcs nélkül. */
export const PACKETA_POINTS_HU: PacketaPoint[] = [
  { id: '25967', name: 'Z-BOX | Árkád Budapest', city: 'Budapest', zip: '1106', street: 'Örs vezér tere 25' },
  { id: '25968', name: 'Z-BOX | WestEnd', city: 'Budapest', zip: '1062', street: 'Váci út 1-3' },
  { id: '25969', name: 'Z-BOX | Mammut', city: 'Budapest', zip: '1024', street: 'Lövőház utca 2-6' },
  { id: '25970', name: 'Z-BOX | Allee', city: 'Budapest', zip: '1117', street: 'Október 23. u. 8-10' },
  { id: '25971', name: 'Z-BOX | Campona', city: 'Budapest', zip: '1222', street: 'Nagytétényi út 37-43' },
  { id: '25972', name: 'Z-BOX | MOM Park', city: 'Budapest', zip: '1123', street: 'Csörsz utca 2-4' },
  { id: '25973', name: 'Z-BOX | Duna Plaza', city: 'Budapest', zip: '1138', street: 'Váci út 178' },
  { id: '25974', name: 'Z-BOX | Pólus Center', city: 'Budapest', zip: '1152', street: 'Szentmihályi út 131' },
  { id: '25975', name: 'Z-BOX | Arena Plaza', city: 'Budapest', zip: '1087', street: 'Kerepesi út 9' },
  { id: '25976', name: 'Z-BOX | Nyugati pályaudvar', city: 'Budapest', zip: '1062', street: 'Teréz krt. 55' },
  { id: '25977', name: 'Z-BOX | Keleti pályaudvar', city: 'Budapest', zip: '1087', street: 'Baross tér' },
  { id: '25978', name: 'Z-BOX | Déli pályaudvar', city: 'Budapest', zip: '1122', street: 'Krisztina krt. 37' },
  { id: '25979', name: 'Z-BOX | Blaha Lujza tér', city: 'Budapest', zip: '1085', street: 'Rákóczi út 9' },
  { id: '25980', name: 'Z-BOX | Széll Kálmán tér', city: 'Budapest', zip: '1012', street: 'Széll Kálmán tér 1' },
  { id: '25981', name: 'Z-BOX | Örs vezér tere metró', city: 'Budapest', zip: '1106', street: 'Örs vezér tere' },
  { id: '25982', name: 'Z-BOX | Ferenciek tere', city: 'Budapest', zip: '1053', street: 'Kossuth Lajos u. 16' },
  { id: '25983', name: 'Z-BOX | Corvin Plaza', city: 'Budapest', zip: '1082', street: 'Futó utca 37-45' },
  { id: '25984', name: 'Z-BOX | Etele Plaza', city: 'Budapest', zip: '1115', street: 'Etele tér' },
  { id: '25985', name: 'Z-BOX | Debrecen Fórum', city: 'Debrecen', zip: '4024', street: 'Csapó utca 30' },
  { id: '25986', name: 'Z-BOX | Szeged Árkád', city: 'Szeged', zip: '6724', street: 'Londoni körút 3' },
  { id: '25987', name: 'Z-BOX | Pécs Árkád', city: 'Pécs', zip: '7632', street: 'Megyeri út 76' },
  { id: '25988', name: 'Z-BOX | Győr Árkád', city: 'Győr', zip: '9024', street: 'Budai út 1' },
  { id: '25989', name: 'Z-BOX | Miskolc Auchan', city: 'Miskolc', zip: '3519', street: 'József Attila út 87' },
  { id: '25990', name: 'Z-BOX | Nyíregyháza Plaza', city: 'Nyíregyháza', zip: '4400', street: 'Szent István utca 48' },
  { id: '25991', name: 'Z-BOX | Székesfehérvár Alba', city: 'Székesfehérvár', zip: '8000', street: 'Palotai út 12' },
];

export function searchPacketaPoints(query: string, limit = 20): PacketaPoint[] {
  const q = query.trim().toLowerCase();
  if (!q) return PACKETA_POINTS_HU.slice(0, limit);
  return PACKETA_POINTS_HU.filter((p) => {
    const hay = [p.name, p.city, p.street, p.zip, p.id].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  }).slice(0, limit);
}
