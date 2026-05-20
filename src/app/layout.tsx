import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppChrome from "../components/layout/AppChrome";
import { Toaster } from "sonner";
import { buildPageMetadata, siteConfig } from "@/lib/seo";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={`${interSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <AppChrome>{children}</AppChrome>
        <Toaster 
          position="bottom-center"
          toastOptions={{
            style: {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(9, 177, 186, 0.2)',
              color: '#1a1a1a',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
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