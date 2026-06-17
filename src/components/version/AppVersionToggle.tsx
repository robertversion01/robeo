'use client';

import { useAppVersion } from '@/context/AppVersionContext';
import { isV2PreviewEnabled } from '@/lib/appVersion';

/** v1/v2 kapcsoló — csak fejlesztői előnézet (élesben rejtett). */
export default function AppVersionToggle() {
  if (!isV2PreviewEnabled()) return null;

  const { version, setVersion } = useAppVersion();
  const isV2 = version === 'v2';

  return (
    <div
      className="pointer-events-auto fixed right-2 top-14 z-[400] flex items-center gap-1.5 rounded-full border border-[#2a3941] bg-[#11171a]/95 px-2 py-1 text-xs shadow-sm backdrop-blur-sm md:right-3 md:top-3"
      role="group"
      aria-label="Alkalmazás verzió"
    >
      <span className={!isV2 ? 'font-semibold text-[#e7edf0]' : 'text-[#6b7d85]'}>v1</span>
      <button
        type="button"
        role="switch"
        aria-checked={isV2}
        aria-label={isV2 ? 'Váltás v1-re' : 'Váltás v2-re'}
        onClick={() => setVersion(isV2 ? 'v1' : 'v2')}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          isV2 ? 'bg-teal-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-[#1a2328] shadow transition-transform ${
            isV2 ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={isV2 ? 'font-semibold text-[#e7edf0]' : 'text-[#6b7d85]'}>v2</span>
    </div>
  );
}
