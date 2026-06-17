import Link from 'next/link';
import {
  PRIVACY_META,
  PRIVACY_SECTIONS,
} from '@/content/legal/privacyPolicyHu';
import PrivacyPolicySectionBody from '@/components/legal/PrivacyPolicySectionBody';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export default function PrivacyPolicyDocument() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-[#e7edf0]">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">GDPR</p>
      <h1 className="text-3xl font-bold text-[#007782]">{PRIVACY_META.title}</h1>
      <p className="mt-2 text-sm text-[#8fa3ad]">
        Utolsó frissítés: {PRIVACY_META.lastUpdated.replace(/-/g, '/')} · Verzió: {LEGAL_VERSION}
      </p>
      <p className="mt-3 rounded-lg border border-amber-900/45 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
        {PRIVACY_META.demoNotice}
      </p>

      <nav
        aria-label="Tartalomjegyzék"
        className="mt-8 rounded-xl border border-[#2a3941] bg-[#141d21] p-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#8fa3ad]">Tartalomjegyzék</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          {PRIVACY_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="font-medium text-[#007782] hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-12">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-[#e7edf0]">{section.title}</h2>
            <PrivacyPolicySectionBody section={section} />
          </section>
        ))}
      </div>

      <footer className="mt-12 space-y-3 border-t border-[#2a3941] pt-6 text-sm text-[#8fa3ad]">
        <p>
          Kapcsolódó dokumentumok:{' '}
          <Link href="/legal/terms" className="font-semibold text-[#007782] hover:underline">
            Piactér ÁSZF
          </Link>
          {' · '}
          <Link href="/legal/pay" className="font-semibold text-[#007782] hover:underline">
            ROBEO Pay ÁSZF
          </Link>
          {' · '}
          <Link href="/legal/cookies" className="font-semibold text-[#007782] hover:underline">
            Cookie szabályzat
          </Link>
        </p>
      </footer>
    </article>
  );
}
