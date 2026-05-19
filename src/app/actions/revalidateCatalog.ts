'use server';

import { revalidatePath } from 'next/cache';

/** Next.js gyorsítótár törlése a főoldali listához (feltöltés, fizetés, webhook). */
export async function revalidateCatalog(): Promise<void> {
  revalidatePath('/');
  revalidatePath('/favorites');
}
