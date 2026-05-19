'use server';

import { revalidatePath } from 'next/cache';

/** Next.js gyorsítótár törlése a főoldali listához (Stripe webhook / checkout success). */
export async function revalidateCatalog(): Promise<void> {
  revalidatePath('/');
  revalidatePath('/favorites');
}
