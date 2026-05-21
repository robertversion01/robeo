import Link from 'next/link';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export const metadata = {
  title: 'Adatvédelem — ROBEO Demo',
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 prose prose-sm text-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">GDPR — DEMO</p>
      <h1 className="text-2xl font-bold text-[#007782]">Adatvédelmi tájékoztató</h1>
      <p className="text-sm text-gray-500">Verzió: {LEGAL_VERSION}</p>
      <h2>Kezelt adatok</h2>
      <ul>
        <li>Regisztrációs e-mail és profil adatok</li>
        <li>Tranzakciók, pénztárca előzmények, üzenetek</li>
        <li>Sütik (szükséges + opcionális analitika/marketing demó)</li>
      </ul>
      <h2>Jogaid</h2>
      <p>
        A profil beállításokban letöltheted az adathordozhatósági exportot (JSON), és kérheted a
        fiók demó anonimizálását (soft-delete).
      </p>
      <h2>Adatkezelő</h2>
      <p>ROBEO Marketplace Demo Kft. — kizárólag teszt célú adatkezelés.</p>
      <p>
        <Link href="/legal/terms" className="text-[#007782] font-semibold hover:underline">
          ÁSZF →
        </Link>
      </p>
      <p>
        <Link href="/" className="text-gray-500 hover:underline">
          ← Vissza a főoldalra
        </Link>
      </p>
    </article>
  );
}
