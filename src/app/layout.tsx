import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROBEO - A te stílusod, a te közösséged",
  description: "Másodkézkeskedés úgy, ahogyan az kellene. Vásárolj, adj el, cserélj és találj új barátokat a stílusos közösségben. 100% magyar platform.",
  keywords: ["másodkéz", "használt ruházat", "cipő", "streetwear", "vásárlás", "eladás", "piac", "robeo", "közösség", "magyar"],
  authors: [{ name: "ROBEO" }],
  openGraph: {
    title: "ROBEO - A te stílusod, a te közösséged",
    description: "Másodkézkeskedés úgy, ahogyan az kellene. Biztonságos, egyszerű és stílusos.",
    type: "website",
    locale: "hu_HU",
    siteName: "ROBEO"
  },
  twitter: {
    card: "summary_large_image",
    title: "ROBEO - A te stílusod, a te közösséged",
    description: "Másodkézkeskedés úgy, ahogyan az kellene."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        {children}
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(30, 27, 75, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              color: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            },
            duration: 4500,
          }}
        />
      </body>
    </html>
  );
}
