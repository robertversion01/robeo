'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Heart, Camera, MapPin, ShieldAlert, Flag } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { MAIN_TOP_PADDING } from '@/lib/layoutTokens';

export default function CommunityPage() {
  const { t } = useTranslation();

  const principles = [
    { icon: Heart, titleKey: 'community.principles.kindnessTitle', bodyKey: 'community.principles.kindnessBody' },
    { icon: Camera, titleKey: 'community.principles.honestyTitle', bodyKey: 'community.principles.honestyBody' },
    { icon: MapPin, titleKey: 'community.principles.safetyTitle', bodyKey: 'community.principles.safetyBody' },
    { icon: ShieldAlert, titleKey: 'community.principles.prohibitedTitle', bodyKey: 'community.principles.prohibitedBody' },
    { icon: Flag, titleKey: 'community.principles.reportTitle', bodyKey: 'community.principles.reportBody' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#1a2328] text-[#e7edf0]">
      <main className={`${MAIN_TOP_PADDING} px-4`}>
        <div className="max-w-lg mx-auto pb-10">
          <PageHeader title={t('community.title')} subtitle={t('community.subtitle')} />

          <ul className="space-y-3">
            {principles.map((p) => {
              const Icon = p.icon;
              return (
                <li
                  key={p.titleKey}
                  className="flex items-start gap-3 rounded-xl border border-[#2a3941] bg-[#1a2328] p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#007782]/10 text-[#007782]">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#e7edf0] text-sm">{t(p.titleKey)}</p>
                    <p className="text-xs text-[#8fa3ad] mt-0.5 leading-relaxed">{t(p.bodyKey)}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <section className="mt-6 rounded-xl border border-[#007782]/20 bg-[#007782]/5 p-4">
            <h2 className="text-sm font-bold text-[#e7edf0]">{t('community.linksTitle')}</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/legal/terms" className="text-[#007782] hover:underline">
                  {t('community.termsLink')}
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="text-[#007782] hover:underline">
                  {t('community.privacyLink')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-[#007782] hover:underline">
                  {t('community.helpLink')}
                </Link>
              </li>
            </ul>
            <p className="mt-3 text-xs text-[#8fa3ad]">{t('community.feedbackHint')}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
