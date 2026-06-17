'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  addCustomSavedReply,
  loadCustomSavedRepliesMerged,
  removeCustomSavedReply,
  type SellerSavedReply,
} from '@/lib/sellerSavedReplies';

type Props = {
  className?: string;
};

export default function SellerSavedRepliesEditor({ className = '' }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<SellerSavedReply[]>([]);
  const [label, setLabel] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const rows = await loadCustomSavedRepliesMerged(supabase);
    setCustom(rows);
  }, []);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const add = async () => {
    const b = body.trim();
    if (b.length < 3) {
      toast.error(t('savedReplies.tooShort'));
      return;
    }
    setBusy(true);
    try {
      await addCustomSavedReply(supabase, label, b);
      setLabel('');
      setBody('');
      await refresh();
      toast.success(t('savedReplies.saved'));
    } catch {
      toast.error(t('savedReplies.error'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await removeCustomSavedReply(supabase, id);
      await refresh();
    } catch {
      toast.error(t('savedReplies.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-lg border border-dashed border-[#2a3941] bg-[#141d21]/80 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[11px] font-semibold text-[#8fa3ad] hover:text-[#007782]"
      >
        {t('savedReplies.manage')}
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open ? (
        <div className="border-t border-[#2a3941] px-2.5 pb-2.5 pt-2 space-y-2">
          {custom.length > 0 ? (
            <ul className="space-y-1">
              {custom.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-2 rounded-md bg-[#1a2328] border border-[#2a3941] px-2 py-1.5 text-[11px]"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[#e7edf0]">{r.label}</span>
                    <p className="text-[#8fa3ad] truncate">{r.body}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(r.id)}
                    className="shrink-0 rounded p-1 text-[#6b7d85] hover:text-red-600"
                    aria-label={t('savedReplies.remove')}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-[#8fa3ad]">{t('savedReplies.customEmpty')}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={40}
              placeholder={t('savedReplies.labelPlaceholder')}
              className="rounded-md border border-[#2a3941] px-2 py-1.5 text-[11px] focus:border-[#007782] focus:outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder={t('savedReplies.bodyPlaceholder')}
              className="rounded-md border border-[#2a3941] px-2 py-1.5 text-[11px] resize-none focus:border-[#007782] focus:outline-none"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void add()}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-[#007782] px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
            >
              <Plus size={12} />
              {t('savedReplies.add')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
