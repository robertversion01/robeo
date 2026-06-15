/** Kurált stílus-címkék — szabad szöveg helyett moderálható lista. */
export const STYLE_TAG_OPTIONS = [
  'streetwear',
  'vintage',
  'minimal',
  'y2k',
  'sport',
  'designer',
  'casual',
  'formal',
  'bohemian',
  'skate',
] as const;

export type StyleTagId = (typeof STYLE_TAG_OPTIONS)[number];

export function styleTagI18nKey(id: string): string {
  return `styleTags.${id}`;
}

export function isStyleTagId(value: string): value is StyleTagId {
  return (STYLE_TAG_OPTIONS as readonly string[]).includes(value);
}

export function normalizeStyleTags(raw: unknown): StyleTagId[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(String)
    .filter((id) => isStyleTagId(id))
    .slice(0, 5);
}
