const VERCEL_BODY_SAFE_BYTES = 4 * 1024 * 1024;

function extFromFile(file: File): string {
  const type = file.type || '';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fromName)) {
    return fromName === 'jpeg' ? 'jpg' : fromName;
  }
  return 'jpg';
}

type SupabaseLike = {
  storage: {
    from: (bucket: string) => {
      upload: (
        path: string,
        file: File,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      uploadToSignedUrl: (
        path: string,
        token: string,
        file: File,
        opts?: { contentType?: string; upsert?: boolean },
      ) => Promise<{ error: { message: string } | null }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

/**
 * Vercel-kompatibilis feltöltés:
 * 1) közvetlen Supabase storage (nincs serverless body limit)
 * 2) signed upload URL (service role aláírás, fájl közvetlenül Storage-ba)
 * 3) multipart API fallback (max 4 MB — Vercel limit alatt)
 */
export async function uploadProductImageFile(
  supabase: SupabaseLike,
  file: File,
  userId: string,
  accessToken: string,
): Promise<string> {
  const contentType = file.type || 'image/jpeg';
  const ext = extFromFile(file);
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const direct = await supabase.storage.from('product-images').upload(path, file, {
    contentType,
    upsert: false,
  });
  if (!direct.error) {
    return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  let signError = '';
  try {
    const signRes = await fetch('/api/upload/product-image/sign', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contentType, ext }),
    });
    const signJson = (await signRes.json()) as {
      path?: string;
      token?: string;
      publicUrl?: string;
      error?: string;
    };
    if (!signRes.ok) {
      signError = signJson.error || `sign HTTP ${signRes.status}`;
    } else if (signJson.path && signJson.token && signJson.publicUrl) {
      const signed = await supabase.storage
        .from('product-images')
        .uploadToSignedUrl(signJson.path, signJson.token, file, {
          contentType,
          upsert: false,
        });
      if (!signed.error) return signJson.publicUrl;
      signError = signed.error.message;
    }
  } catch (e) {
    signError = e instanceof Error ? e.message : 'sign failed';
  }

  if (file.size <= VERCEL_BODY_SAFE_BYTES) {
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    const apiRes = await fetch('/api/upload/product-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formDataUpload,
    });
    const apiJson = (await apiRes.json()) as { publicUrl?: string; error?: string };
    if (apiRes.ok && apiJson.publicUrl) return apiJson.publicUrl;
    throw new Error(apiJson.error || signError || direct.error.message);
  }

  throw new Error(signError || direct.error.message || 'Upload failed');
}

export function isMobileUploadContext(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
}
