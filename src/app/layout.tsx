import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "../components/layout/Navbar";
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
  title: "Vinted - Vásárolj, adj el és cserélj használt ruhákat",
  description: "Vásárolj és adj el használt ruhákat, kiegészítőket, kozmetikumokat és még sok mást. Vinted a legjobb hely, ahol eladhatod a már nem használt dolgaidat és új kincseket találhatsz.",
  keywords: ["másodkéz", "használt ruházat", "cipő", "divat", "vásárlás", "eladás", "piac", "vinted", "fenntartható", "magyar"],
  authors: [{ name: "Vinted" }],
  openGraph: {
    title: "Vinted - Vásárolj, adj el és cserélj használt ruhákat",
    description: "Vásárolj és adj el használt ruhákat, kiegészítőket, kozmetikumokat és még sok mást.",
    type: "website",
    locale: "hu_HU",
    siteName: "Vinted"
  },
  twitter: {
    card: "summary_large_image",
    title: "Vinted - Vásárolj, adj el és cserélj használt ruhákat",
    description: "Vásárolj és adj el használt ruhákat, kiegészítőket, kozmetikumokat és még sok mást."
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
      lang="hu"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pt-10">
        <Navbar />
        {children}
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