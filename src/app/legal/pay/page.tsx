import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import { PAY_TERMS_META, PAY_TERMS_SECTIONS } from '@/content/legal/payTermsHu';

export const metadata = {
  title: 'ROBEO Pay ÁSZF — ROBEO',
  description: 'ROBEO Pay pénztárca és fizetési szolgáltatások általános szerződési feltételei (demó).',
};

export default function PayTermsPage() {
  return (
    <LegalDocumentPage
      badge="ROBEO Pay · DEMO"
      title={PAY_TERMS_META.title}
      version={PAY_TERMS_META.version}
      demoNotice={PAY_TERMS_META.demoNotice}
      sections={PAY_TERMS_SECTIONS}
      relatedLinks={[
        { href: '/legal/terms', label: 'Piactér ÁSZF' },
        { href: '/legal/privacy', label: 'Adatvédelem' },
        { href: '/legal/cookies', label: 'Cookie szabályzat' },
      ]}
    />
  );
}
