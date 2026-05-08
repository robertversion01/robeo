import { createClient } from '@supabase/supabase-js';

type ProductHeadData = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  images?: string[] | null;
};

async function loadProduct(id: string): Promise<ProductHeadData | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await client
    .from('products')
    .select('id, name, price, image_url, images')
    .eq('id', id)
    .maybeSingle();

  return (data as ProductHeadData | null) || null;
}

export default async function Head({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await loadProduct(id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://robeo.vercel.app';
  const productUrl = `${baseUrl}/products/${id}`;

  if (!product) {
    return (
      <>
        <title>Termek | Robeo</title>
        <meta name="description" content="Nezd meg ezt a termeket a Robeo-n!" />
        <meta property="og:title" content="Termek | Robeo" />
        <meta property="og:description" content="Nezd meg ezt a termeket a Robeo-n!" />
        <meta property="og:url" content={productUrl} />
        <meta property="og:type" content="product" />
      </>
    );
  }

  const title = `${product.name} - ${Number(product.price || 0).toLocaleString('hu-HU')} Ft | Robeo`;
  const description = 'Nezd meg ezt a termeket a Robeo-n!';
  const firstImage =
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) ||
    product.image_url ||
    undefined;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={productUrl} />
      <meta property="og:type" content="product" />
      {firstImage ? <meta property="og:image" content={firstImage} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {firstImage ? <meta name="twitter:image" content={firstImage} /> : null}
    </>
  );
}

