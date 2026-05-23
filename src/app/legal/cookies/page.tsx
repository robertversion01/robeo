import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import { COOKIE_POLICY_META, COOKIE_POLICY_SECTIONS } from '@/content/legal/cookiePolicyHu';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export const metadata = {
  title: 'Cookie szabályzat — ROBEO',
  description: 'ROBEO cookie és hasonló technológiák használata.',
};

export default function CookiePolicyPage() {
  return (
    <LegalDocumentPage
      badge="Cookie · GDPR"
      title={COOKIE_POLICY_META.title}
      lastUpdated={COOKIE_POLICY_META.lastUpdated}
      version={LEGAL_VERSION}
      sections={COOKIE_POLICY_SECTIONS}
      relatedLinks={[
        { href: '/legal/privacy', label: 'Adatvédelmi tájékoztató' },
        { href: '/legal/terms', label: 'ÁSZF' },
      ]}
    />
  );
}
