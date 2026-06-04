import { NavLink, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BrowsePage from './pages/BrowsePage';

const NAV_LINKS = [
  { to: '/', label: 'Kezdőlap' },
  { to: '/browse', label: 'Böngészés' },
];

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <span className="font-extrabold text-[#007782] tracking-tight text-lg">
            ROBEO
            <sup className="ml-1 text-[10px] font-semibold text-[#007782]/70">v2</sup>
          </span>
          <nav className="ml-auto flex gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-[#007782] text-white'
                      : 'text-gray-700 hover:bg-[#007782]/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route
            path="*"
            element={
              <div className="max-w-5xl mx-auto px-4 py-16 text-center">
                <h1 className="text-xl font-bold text-gray-900 mb-2">404 — nincs ilyen oldal</h1>
                <p className="text-sm text-gray-600">
                  A V2 előnézet csak fejlesztői módban érhető el.
                </p>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-gray-200 bg-white/90 py-3 text-center text-xs text-gray-500">
        ROBEO v2 preview — Vite + React + Tailwind v4
      </footer>
    </div>
  );
}
