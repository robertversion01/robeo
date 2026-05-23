import Link from 'next/link';
import LegalDocumentPage from '@/components/legal/LegalDocumentPage';
import { TERMS_META, TERMS_SECTIONS } from '@/content/legal/termsHu';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export const metadata = {
  title: 'ÁSZF — ROBEO',
  description: 'ROBEO piactér általános szerződési feltételei (demó környezet).',
};

export default function TermsPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="rounded-xl border border-[#007782]/25 bg-[#007782]/5 px-4 py-3 text-sm leading-relaxed text-gray-800">
          <p className="font-semibold text-[#007782]">ROBEO Pay</p>
          <p className="mt-1">
            {TERMS_META.payNotice}{' '}
            <Link href="/legal/pay" className="font-semibold text-[#007782] hover:underline">
              ROBEO Pay ÁSZF →
            </Link>
          </p>
        </div>
      </div>
      <LegalDocumentPage
        badge="FELHASZNÁLÁSI FELTÉTELEK"
        title={TERMS_META.title}
        lastUpdated={TERMS_META.lastUpdated}
        version={LEGAL_VERSION}
        demoNotice={TERMS_META.demoNotice}
        sections={TERMS_SECTIONS}
        relatedLinks={[
          { href: '/legal/pay', label: 'ROBEO Pay ÁSZF' },
          { href: '/legal/privacy', label: 'Adatvédelem' },
          { href: '/legal/cookies', label: 'Cookie szabályzat' },
        ]}
      />
    </>
  );
}
