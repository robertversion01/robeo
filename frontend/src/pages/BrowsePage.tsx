import { useEffect, useState } from 'react';
import axios from 'axios';

type BrowseItem = {
  id: string | number;
  name: string;
  price?: number | string;
  brand?: string | null;
  imageUrl?: string | null;
};

type ApiResponse = {
  items?: BrowseItem[];
  ok?: boolean;
};

const FORMATTER = new Intl.NumberFormat('hu-HU');

export default function BrowsePage() {
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // A vite.config.ts proxy a backend (5055) /api endpointjaira irányítja.
        const res = await axios.get<ApiResponse>('/api/products', {
          params: { limit: 12 },
        });
        if (cancelled) return;
        const list = Array.isArray(res.data?.items) ? res.data.items : [];
        setItems(list);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'API hiba';
        setError(`A backend (5055) nem érhető el. (${message})`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Böngészés (V2 preview)</h1>
      <p className="text-sm text-gray-600 mb-6">
        Próba hívás a <code className="rounded bg-gray-100 px-1">/api/products</code> végpontra
        (Vite proxy → Marketplace.API @ port 5055).
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Betöltés…</p>
      ) : error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
          <p className="mt-2 text-xs">
            Indítsd a backendet a <code className="rounded bg-white px-1">backend</code> mappában
            (lásd <code className="rounded bg-white px-1">backend/run_v2.ps1</code>), vagy állítsd
            be a <code className="rounded bg-white px-1">VITE_API_PROXY_TARGET</code> változót.
          </p>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">Nincs visszaadott termék.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-full aspect-[3/4] object-cover rounded-md mb-2"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-gray-100 rounded-md mb-2" />
              )}
              <p className="text-sm font-semibold truncate">{item.name}</p>
              {item.brand ? (
                <p className="text-xs text-gray-500 truncate">{item.brand}</p>
              ) : null}
              {item.price !== undefined ? (
                <p className="text-sm font-bold text-[#007782] mt-1 tabular-nums">
                  {FORMATTER.format(Number(item.price) || 0)} Ft
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
