import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildPageMetadata, siteConfig } from '@/lib/seo';

async function loadProduct(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return null;

  const client = createClient(supabaseUrl, supabaseAnon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await client
    .from('products')
    .select('id, name, price, description, image_url, images, brand')
    .eq('id', id)
    .maybeSingle();

  return data as {
    id: string;
    name: string;
    price: number;
    description?: string | null;
    image_url: string | null;
    images?: string[] | null;
    brand?: string | null;
  } | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  const path = `/products/${id}`;

  if (!product) {
    return buildPageMetadata({
      title: `Termék | ${siteConfig.name}`,
      description: 'A termék nem található vagy már nem elérhető.',
      path,
      noIndex: true,
    });
  }

  const price = Number(product.price || 0).toLocaleString('hu-HU');
  const title = `${product.name} — ${price} Ft | ${siteConfig.name}`;
  const description =
    (product.description || '').slice(0, 160) ||
    `${product.brand ? `${product.brand} · ` : ''}Használt termék a ROBEO piacterén. Vásárolj biztonságosan vevővédelemmel.`;

  const image =
    (Array.isArray(product.images) && product.images[0]) || product.image_url || undefined;

  return buildPageMetadata({
    title,
    description,
    path,
    image,
  });
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await loadProduct(id);

  if (!product) return children;

  const image =
    (Array.isArray(product.images) && product.images[0]) || product.image_url || undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: image ? [image] : undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${siteConfig.url}/products/${id}`,
      priceCurrency: 'HUF',
      price: Number(product.price || 0).toString(),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
