'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MessageCircleQuestion, Send } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type QuestionRow = {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

type Props = {
  productId: string;
  sellerId: string;
  viewerId: string | null;
};

export default function ProductQA({ productId, sellerId, viewerId }: Props) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-HU' : 'hu-HU';
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const isOwner = Boolean(viewerId && viewerId === sellerId);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_questions')
      .select('id, question, answer, answered_at, created_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) {
      setAvailable(false);
      setLoaded(true);
      return;
    }
    setQuestions((data || []) as QuestionRow[]);
    setLoaded(true);
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const ask = async () => {
    const q = draft.trim();
    if (q.length < 3) {
      toast.error(t('qa.tooShort'));
      return;
    }
    setAsking(true);
    try {
      const { error } = await supabase.from('product_questions').insert({
        product_id: productId,
        asker_id: viewerId,
        seller_id: sellerId,
        question: q.slice(0, 500),
      });
      if (error) throw error;
      toast.success(t('qa.sent'));
      setDraft('');
      await load();
    } catch {
      toast.error(t('qa.error'));
    } finally {
      setAsking(false);
    }
  };

  const answer = async (id: string) => {
    const a = (answerDrafts[id] || '').trim();
    if (a.length < 1) return;
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('product_questions')
        .update({ answer: a.slice(0, 500), answered_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(t('qa.answerSaved'));
      setAnswerDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await load();
    } catch {
      toast.error(t('qa.error'));
    } finally {
      setSavingId(null);
    }
  };

  // Ha a tabla meg nincs migralva, ne mutassunk semmit (graceful).
  if (loaded && !available) return null;

  return (
    <section className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <MessageCircleQuestion size={16} className="text-[#007782]" />
        {t('qa.title')}
        {questions.length > 0 ? (
          <span className="text-xs font-normal text-gray-400">({questions.length})</span>
        ) : null}
      </h3>

      {/* Kerdes feltetele (nem az elado, bejelentkezve) */}
      {!isOwner ? (
        viewerId ? (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={500}
              placeholder={t('qa.askPlaceholder')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#007782] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !asking) void ask();
              }}
            />
            <button
              type="button"
              disabled={asking}
              onClick={() => void ask()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#007782] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
            >
              <Send size={14} />
              {t('qa.askCta')}
            </button>
          </div>
        ) : (
          <Link href="/auth" className="mt-2 inline-block text-xs font-semibold text-[#007782] hover:underline">
            {t('qa.loginToAsk')}
          </Link>
        )
      ) : null}

      {/* Lista */}
      {questions.length === 0 ? (
        <p className="mt-2 text-xs text-gray-500">{t('qa.empty')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {questions.map((q) => (
            <li key={q.id} className="rounded-lg bg-gray-50 border border-gray-200 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-800">
                  <span className="font-semibold text-gray-500">Q:</span> {q.question}
                </p>
                <span className="shrink-0 text-[10px] text-gray-400">
                  {new Date(q.created_at).toLocaleDateString(locale)}
                </span>
              </div>

              {q.answer ? (
                <p className="mt-1.5 rounded border-l-2 border-[#007782] bg-white px-2 py-1 text-sm text-gray-700">
                  <span className="font-semibold text-[#007782]">A:</span> {q.answer}
                </p>
              ) : isOwner ? (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={answerDrafts[q.id] || ''}
                    onChange={(e) =>
                      setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    maxLength={500}
                    placeholder={t('qa.answerPlaceholder')}
                    className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-[#007782] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={savingId === q.id}
                    onClick={() => void answer(q.id)}
                    className="rounded-lg bg-[#007782] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#00616b] disabled:opacity-60"
                  >
                    {t('qa.answerCta')}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-gray-400">{t('qa.unanswered')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
