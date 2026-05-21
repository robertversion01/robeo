import Link from 'next/link';
import { LEGAL_VERSION } from '@/lib/legalConstants';

export const metadata = {
  title: 'ÁSZF — ROBEO Demo',
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10 prose prose-sm text-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-amber-700">DEMO / TESZT</p>
      <h1 className="text-2xl font-bold text-[#007782]">Általános Szerződési Feltételek</h1>
      <p className="text-sm text-gray-500">Verzió: {LEGAL_VERSION}</p>
      <p>
        A ROBEO egy demó piactér tesztkörnyezetben. A regisztrációval elfogadod, hogy a platform
        nem minősül éles pénzügyi vagy adóügyi szolgáltatásnak.
      </p>
      <h2>1. Szolgáltatás</h2>
      <p>
        A felhasználók használt ruházatot és tárgyakat listázhatnak, vásárolhatnak és eladhatnak
        demó fizetési és szállítási folyamatokkal (Stripe teszt, Foxpost demó címke).
      </p>
      <h2>2. Díjak</h2>
      <p>
        Vevővédelmi díj és szállítási költség a pénztárban jelenik meg. A számlák demó bizonylatok.
      </p>
      <h2>3. Felelősség</h2>
      <p>
        A ROBEO Demo Kft. nem vállal felelősséget éles üzleti használatból eredő károkért. A tartalom
        felelőssége az eladót és vevőt terheli.
      </p>
      <p>
        <Link href="/legal/privacy" className="text-[#007782] font-semibold hover:underline">
          Adatvédelmi tájékoztató →
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
