import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
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
  title: "ROBEO | Másodkézkeskedés Magyarországon",
  description: "Biztonságos és egyszerű másodkézkeskedés. Vásárolj és adj el használt cikkeket gyorsan, megbízhatóan.",
  keywords: ["másodkéz", "használt", "vásárlás", "eladás", "piac", "robeo"],
  authors: [{ name: "ROBEO" }],
  openGraph: {
    title: "ROBEO | Másodkézkeskedés Magyarországon",
    description: "Biztonságos és egyszerű másodkézkeskedés. Vásárolj és adj el használt cikkeket gyorsan, megbízhatóan.",
    type: "website",
    locale: "hu_HU",
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
