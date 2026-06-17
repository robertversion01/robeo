import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppChrome from "../components/layout/AppChrome";
import { Toaster } from "sonner";
import { buildPageMetadata, siteConfig } from "@/lib/seo";
import { getAppBuildId } from "@/lib/appBuild";

/** Next 16: client oldalak static prerenderje workStore hibát dob Vercelen — teljes app dinamikus. */
export const dynamic = "force-dynamic";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    path: "/",
  }),
  keywords: [
    "robeo",
    "másodkéz",
    "használt ruházat",
    "vinted",
    "magyar",
    "piac",
  ],
  authors: [{ name: siteConfig.name }],
};

const APP_BUILD_ID = getAppBuildId();

/** Supabase Storage origin — preconnect a gyorsabb első képbetöltéshez (DNS+TLS warmup). */
const SUPABASE_STORAGE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

/** Régi bundle / cache-elt HTML észlelése — React betöltése előtt fut. */
const DEPLOY_SYNC_SCRIPT = `(function(){try{var reload=function(){var u=new URL(location.href);u.searchParams.set('_robeo',String(Date.now()));location.replace(u.toString());};fetch('/api/app-version',{cache:'no-store',headers:{'Cache-Control':'no-cache'}}).then(function(r){return r.json();}).then(function(d){var api=d&&d.buildId;if(!api||api==='development')return;var meta=document.querySelector('meta[name="robeo-build"]');var html=meta&&meta.getAttribute('content');if(html&&html!==api){reload();return;}var prev=localStorage.getItem('robeo_server_build');localStorage.setItem('robeo_server_build',api);if(prev&&prev!==api){reload();}}).catch(function(){});}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${interSans.variable} ${geistMono.variable} h-full antialiased overflow-x-clip max-w-[100vw] [color-scheme:dark]`}
    >
      <head>
        <meta name="robeo-build" content={APP_BUILD_ID} />
        {SUPABASE_STORAGE_ORIGIN ? (
          <>
            <link rel="preconnect" href={SUPABASE_STORAGE_ORIGIN} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_STORAGE_ORIGIN} />
          </>
        ) : null}
        <script dangerouslySetInnerHTML={{ __html: DEPLOY_SYNC_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col overflow-x-clip max-w-[100vw] bg-[#11171a] text-[#e7edf0]">
        <AppChrome>{children}</AppChrome>
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'rgba(20, 29, 33, 0.96)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(56, 199, 208, 0.3)',
              color: '#e7edf0',
              borderRadius: '8px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.28)',
              fontSize: '14px',
              fontWeight: '500',
            },
            duration: 3000,
            className: 'vinted-shadow',
          }}
        />
      </body>
    </html>
  );
}
