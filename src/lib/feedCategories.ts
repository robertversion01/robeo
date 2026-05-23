/** Vinted-szerű főoldal chip sorrend — „Dizájner” a Férfi után. */
export const FEED_DEPARTMENT_IDS = [
  'all',
  'women',
  'men',
  'designer',
  'kids',
  'home',
  'electronics',
  'entertainment',
  'sports',
] as const;

export type FeedDepartmentId = (typeof FEED_DEPARTMENT_IDS)[number];

export const FEED_CATEGORIES = FEED_DEPARTMENT_IDS.map((id) => ({ id, label: id }));

export function isFeedPseudoDepartment(id: string): id is 'designer' {
  return id === 'designer';
}
