import Link from 'next/link';
import PrivacyPolicySectionBody from '@/components/legal/PrivacyPolicySectionBody';
import type { PrivacySection } from '@/content/legal/privacyPolicyTypes';

type Props = {
  badge: string;
  title: string;
  lastUpdated?: string;
  version?: string;
  demoNotice?: string;
  sections: PrivacySection[];
  relatedLinks: { href: string; label: string }[];
};

export default function LegalDocumentPage({
  badge,
  title,
  lastUpdated,
  version,
  demoNotice,
  sections,
  relatedLinks,
}: Props) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-[#e7edf0]">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-300">{badge}</p>
      <h1 className="text-3xl font-bold text-[#007782]">{title}</h1>
      {(lastUpdated || version) && (
        <p className="mt-2 text-sm text-[#8fa3ad]">
          {lastUpdated ? `Utolsó frissítés: ${lastUpdated.replace(/-/g, '/')}` : null}
          {lastUpdated && version ? ' · ' : null}
          {version ? `Verzió: ${version}` : null}
        </p>
      )}
      {demoNotice ? (
        <p className="mt-3 rounded-lg border border-amber-900/45 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {demoNotice}
        </p>
      ) : null}

      <nav
        aria-label="Tartalomjegyzék"
        className="mt-8 rounded-xl border border-[#2a3941] bg-[#141d21] p-4"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#8fa3ad]">Tartalomjegyzék</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="font-medium text-[#007782] hover:underline">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-12">
        {sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-[#e7edf0]">{section.title}</h2>
            <PrivacyPolicySectionBody section={section} />
          </section>
        ))}
      </div>

      <footer className="mt-12 border-t border-[#2a3941] pt-6 text-sm text-[#8fa3ad]">
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-[#007782] hover:underline">
              {link.label}
            </Link>
          ))}
          <Link href="/" className="text-[#8fa3ad] hover:underline">
            Főoldal
          </Link>
        </p>
      </footer>
    </article>
  );
}
