'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  isPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '@/lib/webPushClient';

type Props = {
  pushEnabled: boolean;
  onPushEnabledChange: (v: boolean) => void;
};

export default function PushDeliveryPanel({ pushEnabled, onPushEnabledChange }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [vapidOk, setVapidOk] = useState<boolean | null>(null);

  const checkVapid = useCallback(async () => {
    try {
      const res = await fetch('/api/push/vapid-public-key');
      const data = await res.json();
      setVapidOk(Boolean(data.publicKey));
    } catch {
      setVapidOk(false);
    }
  }, []);

  useEffect(() => {
    void checkVapid();
  }, [checkVapid]);

  const enablePush = async () => {
    if (!isPushSupported()) {
      setStatus(t('settings.delivery.pushUnsupported'));
      return;
    }
    const sub = await subscribeToWebPush();
    if (!sub.ok) {
      setStatus(t('settings.delivery.pushFailed'));
      return;
    }
    onPushEnabledChange(true);
    setStatus(t('settings.delivery.pushReady'));
    toast.success(t('settings.delivery.pushReady'));
  };

  const disablePush = async () => {
    await unsubscribeFromWebPush();
    onPushEnabledChange(false);
    setStatus(null);
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(t('auth.errors.generic'));

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.hint || data.error || 'Test failed');
      }
      toast.success(
        t('settings.delivery.testPushOk', {
          sent: data.sent ?? 0,
          defaultValue: `Teszt push elküldve (${data.sent ?? 0} eszköz).`,
        }),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('settings.delivery.pushFailed'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#007782]/15 bg-[#007782]/5 p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#e7edf0]">
        <BellRing size={16} className="text-[#007782]" />
        Web Push (E2E)
      </div>
      <p className="text-[11px] text-[#8fa3ad]">
        {vapidOk === false
          ? t('settings.delivery.vapidMissing')
          : t('settings.delivery.pushE2eHint')}
      </p>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-[#27363d] bg-[#1a2328] px-3 py-2">
        <span className="text-sm">{t('settings.delivery.push')}</span>
        <input
          type="checkbox"
          checked={pushEnabled}
          onChange={(e) => {
            void (e.target.checked ? enablePush() : disablePush());
          }}
          className="h-4 w-4 accent-[#007782]"
        />
      </label>
      {status ? <p className="text-[11px] text-[#8fa3ad]">{status}</p> : null}
      {pushEnabled && vapidOk ? (
        <button
          type="button"
          disabled={testing}
          onClick={() => void sendTest()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#007782] px-3 py-1.5 text-xs font-semibold text-[#007782] hover:bg-[#007782]/10 disabled:opacity-60"
        >
          <Send size={14} />
          {testing ? '…' : t('settings.delivery.testPush')}
        </button>
      ) : null}
    </div>
  );
}
