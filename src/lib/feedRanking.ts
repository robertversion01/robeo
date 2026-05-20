import type { Product } from '@/types';
import type { FeedPreferences } from '@/lib/userPreferences';

function norm(s: string | null | undefined) {
  return (s || '').trim().toLowerCase();
}

/** Feed sorrend preferenciák alapján (frontend, DB nélkül) */
export function rankFeedProducts(products: Product[], prefs: FeedPreferences): Product[] {
  const brands = prefs.brands.map(norm).filter(Boolean);
  const sizes = prefs.sizes.map(norm).filter(Boolean);
  const styles = prefs.styles.map(norm).filter(Boolean);

  if (brands.length === 0 && sizes.length === 0 && styles.length === 0) {
    return products;
  }

  const score = (p: Product) => {
    let s = 0;
    const brand = norm(p.brand);
    const size = norm(p.size);
    const name = norm(p.name);
    const desc = norm(p.description);
    const cat = norm(p.category);

    for (const b of brands) {
      if (brand.includes(b) || name.includes(b)) s += 3;
    }
    for (const sz of sizes) {
      if (size.includes(sz)) s += 2;
    }
    for (const st of styles) {
      if (name.includes(st) || desc.includes(st) || cat.includes(st)) s += 1;
    }
    return s;
  };

  return [...products].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
