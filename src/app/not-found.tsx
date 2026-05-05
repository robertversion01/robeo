import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-black text-white flex items-center justify-center">
      <div className="text-center px-4">
        <div className="text-9xl font-bold text-accent mb-4">404</div>
        <h1 className="text-4xl font-bold mb-6">Az oldal nem található</h1>
        <p className="text-white/60 mb-10 max-w-md mx-auto">
          A keresett oldal nem létezik, vagy törölték. Kérlek ellenőrizd a címet, vagy térj vissza a főoldalra.
        </p>
        <Link 
          href="/" 
          className="px-8 py-4 bg-accent text-black font-semibold rounded-xl hover:bg-accent/90 transition-all"
        >
          ← Vissza a főoldalra
        </Link>
      </div>
    </div>
  );
}