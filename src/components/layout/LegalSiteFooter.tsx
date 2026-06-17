import Link from 'next/link';

const LEGAL_COLUMNS = [
  {
    title: 'ROBEO',
    links: [
      { href: '/help', label: 'Súgó' },
      { href: '/browse', label: 'Böngészés' },
      { href: '/community', label: 'Közösségi alapelvek' },
    ],
  },
  {
    title: 'Jogi',
    links: [
      { href: '/legal/privacy', label: 'Adatvédelmi tájékoztató' },
      { href: '/legal/terms', label: 'Általános Szerződési Feltételek' },
      { href: '/legal/pay', label: 'ROBEO Pay ÁSZF' },
      { href: '/legal/cookies', label: 'Cookie szabályzat' },
    ],
  },
  {
    title: 'Segítség',
    links: [
      { href: '/help', label: 'Súgóközpont' },
      { href: '/messages', label: 'Üzenetek' },
    ],
  },
] as const;

export default function LegalSiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#2a3941] bg-[#141d21] text-[#8fa3ad]">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:grid-cols-3">
        {LEGAL_COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#8fa3ad]">{col.title}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-[#007782] hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[#2a3941] px-4 py-4 text-center text-xs text-[#8fa3ad]">
        © {new Date().getFullYear()} ROBEO Demo ·{' '}
        <Link href="/legal/privacy" className="text-[#007782] hover:underline">
          Adatvédelmi központ
        </Link>
      </div>
    </footer>
  );
}
