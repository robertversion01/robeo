import Link from 'next/link';
import {
  PRIVACY_META,
  PRIVACY_SECTIONS,
} from '@/content/legal/privacyPolicyHu';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export default function PrivacyPolicyDocument() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">GDPR</p>
      <h1 className="text-3xl font-bold text-[#007782]">{PRIVACY_META.title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        Utolsó frissítés: {PRIVACY_META.lastUpdated.replace(/-/g, '/')} · Verzió: {LEGAL_VERSION}
      </p>
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {PRIVACY_META.demoNotice}
      </p>

      <nav
        aria-label="Tartalomjegyzék"
        className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-600">Tartalomjegyzék</h2>
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

      <div className="mt-10 space-y-10">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p.slice(0, 40)} className="mt-3 text-sm leading-relaxed text-gray-700">
                {p}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
                {section.bullets.map((item) => (
                  <li key={item.slice(0, 48)}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm">
        <Link href="/legal/terms" className="font-semibold text-[#007782] hover:underline">
          Általános Szerződési Feltételek →
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/" className="text-gray-500 hover:underline">
          ← Vissza a főoldalra
        </Link>
      </footer>
    </article>
  );
}
