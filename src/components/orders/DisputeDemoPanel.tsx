'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  transactionId: string;
  productName?: string;
};

/** Demo vitatás / refund flow — teszt mód, nem indít éles chargebacket. */
export default function DisputeDemoPanel({ transactionId, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const submit = () => {
    if (!reason.trim()) {
      toast.error('Írd le röviden a problémát.');
      return;
    }
    toast.success(
      `Demo bejelentés rögzítve (${transactionId.slice(0, 8)}…). Éles refund flow később.`,
    );
    setOpen(false);
    setReason('');
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-amber-800 hover:underline inline-flex items-center gap-1"
      >
        <AlertTriangle size={14} />
        Probléma a rendeléssel? (Demo)
      </button>
      {open ? (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-sm">
          <p className="text-xs text-amber-900 mb-2">
            {productName ? `${productName} — ` : ''}
            Teszt vitatás. Nem küldünk automatikus visszatérítést.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pl. nem érkezett meg a csomag / nem egyezik a leírással"
            className="w-full rounded border border-amber-200 px-2 py-1.5 text-xs min-h-[60px]"
          />
          <button
            type="button"
            onClick={submit}
            className="mt-2 h-8 rounded-md bg-amber-700 px-3 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Bejelentés (demo)
          </button>
        </div>
      ) : null}
    </div>
  );
}
