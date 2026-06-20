import type { ProductTypeaheadRow } from '@/lib/listedProducts';

export type VisualSearchResponse = {
  ok?: boolean;
  query?: string;
  products?: ProductTypeaheadRow[];
  error?: string;
  hint?: string;
};

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('read_failed'));
        return;
      }
      const base64 = result.replace(/^data:image\/\w+;base64,/, '');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

export async function postVisualSearch(imageBase64: string): Promise<{
  ok: boolean;
  status: number;
  data: VisualSearchResponse;
}> {
  const res = await fetch('/api/search/visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  });
  const data = (await res.json()) as VisualSearchResponse;
  return { ok: res.ok, status: res.status, data };
}
