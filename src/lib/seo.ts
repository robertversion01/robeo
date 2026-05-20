import type { Metadata } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://robeo.vercel.app';
const DEFAULT_OG = `${SITE_URL}/og-default.png`;

export const siteConfig = {
  name: 'ROBEO',
  url: SITE_URL,
  defaultTitle: 'ROBEO — Vásárolj és adj el használt ruhákat',
  defaultDescription:
    'Biztonságos másodkéz piactér Magyarországon. Böngéssz, alkudj, fizess vevővédelemmel és válassz szállítási módot.',
  locale: 'hu_HU',
};

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path = '',
  image,
  noIndex = false,
}: PageMetaInput): Metadata {
  const url = `${siteConfig.url}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image || DEFAULT_OG;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
    robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
