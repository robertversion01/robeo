import { Link } from 'react-router-dom';

const HIGHLIGHTS = [
  { title: 'Vite + Tailwind v4', body: 'Gyors HMR, modern build, v4 utility-first CSS.' },
  { title: 'Külön app-bridge', body: 'A V1 Next.js app iframe-en keresztül linkel ide preview módban.' },
  { title: 'Backend proxy', body: 'A /api hívások a dotnet Marketplace.API-ra (port 5055) mennek.' },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 mb-3">
        ROBEO <span className="text-[#007782]">v2</span> előnézet
      </h1>
      <p className="text-base text-gray-600 max-w-2xl mb-8">
        Ez a Vite-alapú V2 frontend skeleton. A V1 Next.js app a fő termék, ezt
        csak fejlesztői módban (<code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_ENABLE_V2_PREVIEW=true</code>) lehet bekapcsolni.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <p className="text-sm font-bold text-[#007782]">{item.title}</p>
            <p className="text-sm text-gray-600 mt-1 leading-snug">{item.body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#007782]/20 bg-[#007782]/5 p-5">
        <p className="text-sm font-semibold text-[#007782] mb-1">Indítás</p>
        <pre className="text-xs text-gray-800 bg-white border border-gray-200 rounded-lg p-3 overflow-auto">
{`cd frontend
npm install
npm run dev   # http://localhost:5173`}
        </pre>
        <p className="text-xs text-gray-600 mt-3">
          Aztán nyisd meg a V1 Next.js appot, és kapcsold be a v2 nézetet a
          fejlesztői konzolból:
          <code className="rounded bg-white px-1 ml-1">localStorage.setItem('robeo-ui-version','v2')</code>.
        </p>
        <div className="mt-4">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 rounded-full bg-[#007782] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00616b]"
          >
            Tovább a böngészéshez
          </Link>
        </div>
      </div>
    </div>
  );
}
