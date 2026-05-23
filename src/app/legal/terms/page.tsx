import Link from 'next/link';
import { LEGAL_VERSION, PRIVACY_LAST_UPDATED } from '@/lib/legalConstants';

export const metadata = {
  title: 'ÁSZF — ROBEO',
  description: 'ROBEO piactér általános szerződési feltételei (demó környezet).',
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 text-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">DEMO / TESZT</p>
      <h1 className="text-3xl font-bold text-[#007782]">Általános Szerződési Feltételek</h1>
      <p className="mt-2 text-sm text-gray-500">Verzió: {LEGAL_VERSION}</p>
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        A ROBEO demó piactér tesztkörnyezetben fut. Éles üzemeltetés előtt jogi szakértővel érdemes
        véglegesíteni az ÁSZF-et.
      </p>
      <p className="mt-6 text-sm leading-relaxed text-gray-700">
        A ROBEO egy demó piactér tesztkörnyezetben. A regisztrációval elfogadod, hogy a platform
        nem minősül éles pénzügyi vagy adóügyi szolgáltatásnak. Az adatkezelés részletei az{' '}
        <Link href="/legal/privacy" className="font-semibold text-[#007782] hover:underline">
          Adatvédelmi tájékoztatóban
        </Link>{' '}
        (frissítve: {PRIVACY_LAST_UPDATED.replace(/-/g, '/')}).
      </p>
      <h2 className="mt-8 text-xl font-bold text-gray-900">1. Szolgáltatás</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        A felhasználók használt ruházatot és tárgyakat listázhatnak, vásárolhatnak és eladhatnak
        demó fizetési és szállítási folyamatokkal (Stripe teszt, Foxpost demó címke).
      </p>
      <h2 className="mt-8 text-xl font-bold text-gray-900">2. Díjak</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        Vevővédelmi díj és szállítási költség a pénztárban jelenik meg. A számlák demó bizonylatok.
      </p>
      <h2 className="mt-8 text-xl font-bold text-gray-900">3. Felelősség</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        A ROBEO Demo Kft. nem vállal felelősséget éles üzleti használatból eredő károkért. A tartalom
        felelőssége az eladót és vevőt terheli.
      </p>
      <h2 className="mt-8 text-xl font-bold text-gray-900">4. Életkor</h2>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        A szolgáltatás használatához legalább 18 évesnek kell lenned. Regisztrációkor ezt
        megerősíted.
      </p>
      <footer className="mt-12 border-t border-gray-200 pt-6 text-sm">
        <Link href="/legal/privacy" className="font-semibold text-[#007782] hover:underline">
          Adatvédelmi tájékoztató →
        </Link>
        <span className="mx-2 text-gray-300">|</span>
        <Link href="/" className="text-gray-500 hover:underline">
          ← Vissza a főoldalra
        </Link>
      </footer>
    </article>
  );
}
