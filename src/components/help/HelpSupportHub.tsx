'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { MessageCircle, ShieldCheck, Truck, HelpCircle, Mail, FileText, MessageSquarePlus } from 'lucide-react';
import FeedbackModal from '@/components/feedback/FeedbackModal';

const entries = [
  { icon: MessageCircle, titleKey: 'help.entries.contactSeller.title', descKey: 'help.entries.contactSeller.desc', href: '/browse', actionKey: 'help.entries.contactSeller.action' },
  { icon: ShieldCheck, titleKey: 'help.entries.buyerProtection.title', descKey: 'help.entries.buyerProtection.desc', href: '/help#protection', internal: true },
  { icon: Truck, titleKey: 'help.entries.shipping.title', descKey: 'help.entries.shipping.desc', href: '/help#shipping', internal: true },
  { icon: FileText, titleKey: 'help.entries.orders.title', descKey: 'help.entries.orders.desc', href: '/orders' },
  { icon: HelpCircle, titleKey: 'help.entries.faq.title', descKey: 'help.entries.faq.desc', href: '/help#faq', internal: true },
  { icon: Mail, titleKey: 'help.entries.support.title', descKey: 'help.entries.support.desc', href: 'mailto:support@robeo.hu', external: true },
] as const;

export default function HelpSupportHub() {
  const { t } = useTranslation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="space-y-6">
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <section className="rounded-2xl border border-[#007782]/20 bg-[#007782]/5 p-5">
        <h2 className="text-lg font-bold text-gray-900">{t('help.quickTitle')}</h2>
        <p className="text-sm text-gray-600 mt-1">{t('help.quickSubtitle')}</p>
        <Link
          href="/browse"
          className="mt-4 inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-[#007782] px-6 py-3 text-sm font-semibold text-white hover:bg-[#00616b] touch-manipulation min-h-11"
        >
          {t('help.browseCta')}
        </Link>
      </section>

      <button
        type="button"
        onClick={() => setFeedbackOpen(true)}
        className="flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-[#007782]/30 hover:bg-[#007782]/5 transition-colors touch-manipulation"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007782]/10 text-[#007782]">
          <MessageSquarePlus size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm">{t('feedback.entryTitle')}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t('feedback.entryDesc')}</p>
        </div>
      </button>

      <ul className="space-y-2">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const content = (
            <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-[#007782]/30 hover:bg-[#007782]/5 transition-colors touch-manipulation">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007782]/10 text-[#007782]">
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 text-sm">{t(entry.titleKey)}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{t(entry.descKey)}</p>
                {'actionKey' in entry && entry.actionKey ? (
                  <span className="text-xs font-semibold text-[#007782] mt-2 inline-block">{t(entry.actionKey)} →</span>
                ) : null}
              </div>
            </div>
          );

          if ('external' in entry && entry.external) {
            return (
              <li key={entry.titleKey}>
                <a href={entry.href} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              </li>
            );
          }

          return (
            <li key={entry.titleKey}>
              <Link href={entry.href}>{content}</Link>
            </li>
          );
        })}
      </ul>

      <section id="protection" className="scroll-mt-24 rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">{t('help.sections.protectionTitle')}</h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{t('help.sections.protectionBody')}</p>
      </section>

      <section id="shipping" className="scroll-mt-24 rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900">{t('help.sections.shippingTitle')}</h3>
        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{t('help.sections.shippingBody')}</p>
      </section>

      <section id="faq" className="scroll-mt-24 space-y-3">
        <h3 className="font-bold text-gray-900">{t('help.sections.faqTitle')}</h3>
        {(['q1', 'q2', 'q3'] as const).map((id) => (
          <details key={id} className="rounded-xl border border-gray-200 bg-white group">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
              {t(`help.faq.${id}.q`)}
            </summary>
            <p className="px-4 pb-3 text-sm text-gray-600 leading-relaxed">{t(`help.faq.${id}.a`)}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
