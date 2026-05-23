import LegalSiteFooter from '@/components/layout/LegalSiteFooter';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex-1">{children}</div>
      <LegalSiteFooter />
    </div>
  );
}
