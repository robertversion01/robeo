'use client';

/**
 * RobeoBP — lokális átvétel rendszerüzenet kártya (Clean Slate verzió).
 *
 * Minimalizalt UX: termek THUMBNAIL + cim + ar, role badge ("foglalas
 * erkezett" vagy "sikeres foglalas"), kozossegi pirula, es 1 mondat CTA
 * szoveg amit a felhasznalo a chatben olvas. Tovabbi CTA gomb /
 * focusOrderPanel hivas / amber "sub-disclaimer" NINCS — BP modban a chat
 * felulet teljesen tiszta beszelgetes-dobozkent szolgal, nincs e-commerce
 * stepper / order panel amit "meg lehetne nyitni".
 *
 * A SaleSystemMessageCard NEM modosul — ez kulonallo komponens (NO DELETION).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import ClientFormattedTime from '@/components/ui/ClientFormattedTime';
import SystemMessageRoleBadge from '@/components/messages/SystemMessageRoleBadge';
import { useResolvedTransactionRole } from '@/hooks/useResolvedTransactionRole';
import { ROBEO_BP_MODE } from '@/lib/features';
import { getDistrictLabel, normalizeBudapestDistrict } from '@/lib/budapestDistricts';
import {
  getMeetingPointsForDistrict,
  MEETING_POINT_SAFETY_TIPS,
} from '@/lib/budapestMeetingPoints';

type Props = {
  productId: string | null;
  createdAt: string;
  viewerId: string;
  senderId: string;
  receiverId: string;
  sellerId?: string | null;
  timeLocale?: string;
};

type ProductSnippet = {
  id: string;
  name: string;
  price: number;
  user_id?: string;
  thumbnail: string | null;
  budapest_district?: string | null;
};

const BODY_TEXT =
  'Sikeres foglalás! Egyeztessétek a személyes találkozót, a helyszínt és a készpénzes vagy közvetlen fizetést itt a chatben.';

export default function LocalPickupSystemMessageCard({
  productId,
  createdAt,
  viewerId,
  senderId,
  receiverId,
  sellerId: sellerIdProp = null,
  timeLocale = 'hu-HU',
}: Props) {
  const { t } = useTranslation();
  const [product, setProduct] = useState<ProductSnippet | null>(null);
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowDone, setNoShowDone] = useState(false);

  // A masik fel a beszelgetesben (akit a no-show jelzes erint).
  const otherPartyId = [senderId, receiverId].find((id) => id && id !== viewerId) || null;

  const reportNoShow = async () => {
    if (!otherPartyId) return;
    if (!window.confirm(t('report.noShowConfirm'))) return;
    setNoShowBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error(t('report.loginRequired'));
        return;
      }
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_id: otherPartyId,
        context: 'meetup',
        reason: 'no_show',
        details: productId ? `product:${productId}` : null,
      });
      if (error) {
        if (/relation|does not exist|schema|constraint|check/i.test(error.message)) {
          toast.error(t('report.schemaMissing'));
          return;
        }
        throw error;
      }
      setNoShowDone(true);
      toast.success(t('report.noShowSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('report.error'));
    } finally {
      setNoShowBusy(false);
    }
  };

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, user_id, images, image_url, budapest_district')
        .eq('id', productId)
        .maybeSingle();
      if (cancelled || !data) return;
      const rawThumb =
        (Array.isArray((data as { images?: unknown }).images) &&
          ((data as { images?: string[] }).images?.[0] || null)) ||
        (data as { image_url?: string | null }).image_url ||
        null;
      setProduct({
        id: data.id,
        name: data.name,
        price: Number(data.price) || 0,
        user_id: data.user_id,
        thumbnail: rawThumb ? getOptimizedImageUrl(rawThumb, 80, 70) : null,
        budapest_district: normalizeBudapestDistrict(
          (data as { budapest_district?: string | null }).budapest_district,
        ),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const sellerId = product?.user_id ?? sellerIdProp;
  const role = useResolvedTransactionRole(viewerId, sellerId);
  const title = role === 'seller' ? 'Új foglalás érkezett' : 'Sikeres foglalás!';
  const districtLabel = getDistrictLabel(product?.budapest_district);
  const meetingPoints = ROBEO_BP_MODE
    ? getMeetingPointsForDistrict(product?.budapest_district)
    : [];

  return (
    <div className="max-w-md rounded-xl border border-emerald-700/45 bg-emerald-950/35 px-4 py-3 text-sm text-[#e7edf0]">
      {role ? (
        <div className="flex justify-center mb-1">
          <SystemMessageRoleBadge role={role} />
        </div>
      ) : null}
      <p className="text-center font-semibold text-emerald-200">{title}</p>
      <div className="flex justify-center mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Ingyenes budapesti cserebere — nulla jutalék!
        </span>
      </div>
      {product ? (
        <Link
          href={`/products/${product.id}`}
          className="mt-3 flex items-center gap-3 rounded-lg border border-[#007782]/25 bg-[#1a2328] px-2.5 py-2 hover:bg-[#007782]/5"
        >
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="h-12 w-12 shrink-0 rounded-md bg-[#1a2328]" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#007782]">{product.name}</p>
            <p className="text-xs font-bold tabular-nums text-[#b2c0c6]">
              {formatPrice(product.price)}
            </p>
          </div>
        </Link>
      ) : null}
      {ROBEO_BP_MODE && meetingPoints.length > 0 ? (
        <div className="mt-3 rounded-lg border border-emerald-900/40 bg-[#11171a]/90 px-3 py-2.5 text-left">
          <p className="flex items-center gap-1 text-xs font-semibold text-emerald-200">
            <MapPin size={12} aria-hidden />
            {districtLabel
              ? t('bp.meeting.titleDistrict', { district: districtLabel })
              : t('bp.meeting.titleGeneric')}
          </p>
          <ul className="mt-2 space-y-1">
            {meetingPoints.slice(0, 3).map((point) => (
              <li key={point.id} className="text-[11px] text-[#b2c0c6] leading-snug">
                <span className="font-medium">{point.label}</span>
                {point.hint ? (
                  <span className="block text-[10px] text-[#8fa3ad]">{t(point.hint)}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <ul className="mt-2 space-y-0.5 border-t border-emerald-100 pt-2">
            {MEETING_POINT_SAFETY_TIPS.map((tipKey) => (
              <li key={tipKey} className="text-[10px] text-emerald-300/90">
                · {t(tipKey)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-center text-xs text-[#b2c0c6] mt-3 leading-snug">{BODY_TEXT}</p>
      {otherPartyId && !noShowDone ? (
        <div className="mt-2 text-center">
          <button
            type="button"
            disabled={noShowBusy}
            onClick={() => void reportNoShow()}
            className="text-[10px] font-medium text-[#6b7d85] underline hover:text-red-600 disabled:opacity-50"
          >
            {t('report.noShowAction')}
          </button>
        </div>
      ) : null}
      <div className="mt-2 text-center text-[10px] text-[#6b7d85]">
        <ClientFormattedTime iso={createdAt} locale={timeLocale} />
      </div>
    </div>
  );
}
