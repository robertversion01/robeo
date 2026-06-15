'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import LanguageSwitcher from '@/components/home/LanguageSwitcher';
import ProfileSection from '@/components/profile/ProfileSection';
import {
  DEFAULT_USER_PREFS,
  loadUserPreferences,
  saveUserPreferences,
  type NotificationChannelPrefs,
  type UserPreferenceBundle,
} from '@/lib/userPreferences';
import {
  DEFAULT_DELIVERY_PREFS,
  loadDeliveryPrefs,
  saveDeliveryPrefs,
  type NotificationDeliveryPrefs,
} from '@/lib/notificationChannels';
import PushDeliveryPanel from '@/components/profile/PushDeliveryPanel';
import { toast } from 'sonner';
import { loadProfileVacationMode, setProfileVacationMode } from '@/lib/vacationMode';
import { loadProfileBio, saveProfileBio } from '@/lib/profileBio';
import { notifyCatalogUpdated } from '@/lib/catalogRefresh';
import { Palmtree } from 'lucide-react';
import { ROBEO_BP_MODE } from '@/lib/features';
import { STYLE_TAG_OPTIONS } from '@/lib/styleTags';
import HomeDistrictPicker from '@/components/browse/HomeDistrictPicker';

type Props = {
  userId?: string;
};

function TagInput({
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft('');
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      <p className="text-[11px] text-gray-500">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full border border-[#007782]/25 bg-[#007782]/5 px-2.5 py-1 text-xs font-medium text-[#007782]"
          >
            {v} ×
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button type="button" onClick={add} className="btn-base btn-secondary shrink-0 text-xs">
          +
        </button>
      </div>
    </div>
  );
}

function ChannelToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
      <span className="text-sm text-gray-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#007782]"
      />
    </label>
  );
}

export default function ProfileSettingsHub({ userId }: Props) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<UserPreferenceBundle>(DEFAULT_USER_PREFS);
  const [delivery, setDelivery] = useState<NotificationDeliveryPrefs>(DEFAULT_DELIVERY_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [gdprBusy, setGdprBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationBusy, setVacationBusy] = useState(false);
  const [bio, setBio] = useState('');
  const [bioBusy, setBioBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [p, d, vacation, profileBio] = await Promise.all([
      loadUserPreferences(supabase),
      loadDeliveryPrefs(supabase),
      loadProfileVacationMode(supabase, userId),
      loadProfileBio(supabase, userId),
    ]);
    setPrefs(p);
    setDelivery(d);
    setVacationMode(vacation);
    setBio(profileBio);
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = async (next: UserPreferenceBundle) => {
    setPrefs(next);
    setSaving(true);
    try {
      await saveUserPreferences(supabase, next);
    } finally {
      setSaving(false);
    }
  };

  const patchNotifications = (patch: Partial<NotificationChannelPrefs>) => {
    void persist({
      ...prefs,
      notifications: { ...prefs.notifications, ...patch },
    });
  };

  if (!loaded) {
    return <p className="text-sm text-gray-500 py-4">{t('common.loading')}</p>;
  }

  const toggleVacationMode = async (next: boolean) => {
    if (!userId) return;
    setVacationBusy(true);
    const prev = vacationMode;
    setVacationMode(next);
    try {
      const result = await setProfileVacationMode(supabase, userId, next);
      if (!result.ok) {
        setVacationMode(prev);
        if (result.error === 'vacation_mode_column_missing') {
          toast.error(t('settings.vacation.schemaMissing'));
        } else {
          toast.error(result.error || t('auth.errors.generic'));
        }
        return;
      }
      notifyCatalogUpdated();
      toast.success(next ? t('settings.vacation.enabled') : t('settings.vacation.disabled'));
    } catch {
      setVacationMode(prev);
      toast.error(t('auth.errors.generic'));
    } finally {
      setVacationBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProfileSection title={t('settings.vacation.title')}>
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2 shrink-0">
              <Palmtree size={18} className="text-amber-800" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{t('settings.vacation.heading')}</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t('settings.vacation.hint')}</p>
              <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200/60 bg-white/80 px-3 py-2.5 cursor-pointer">
                <span className="text-sm font-medium text-gray-800">
                  {vacationMode ? t('settings.vacation.onLabel') : t('settings.vacation.offLabel')}
                </span>
                <input
                  type="checkbox"
                  checked={vacationMode}
                  disabled={vacationBusy || !userId}
                  onChange={(e) => void toggleVacationMode(e.target.checked)}
                  className="h-4 w-4 accent-amber-700"
                  aria-label={t('settings.vacation.heading')}
                />
              </label>
            </div>
          </div>
        </div>
      </ProfileSection>

      <ProfileSection title={t('settings.bio.title')}>
        <p className="text-xs text-gray-500 mb-3">{t('settings.bio.hint')}</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={4}
          placeholder={t('settings.bio.placeholder')}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 resize-y min-h-[96px]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-400 tabular-nums">{bio.length}/280</span>
          <button
            type="button"
            disabled={bioBusy || !userId}
            onClick={() => {
              if (!userId) return;
              setBioBusy(true);
              void saveProfileBio(supabase, userId, bio)
                .then((result) => {
                  if (!result.ok) {
                    if (result.error === 'bio_column_missing') {
                      toast.error(t('settings.bio.schemaMissing'));
                    } else {
                      toast.error(result.error);
                    }
                    return;
                  }
                  toast.success(t('settings.bio.saved'));
                })
                .finally(() => setBioBusy(false));
            }}
            className="btn-base btn-secondary text-xs min-h-9 px-4 disabled:opacity-60"
          >
            {bioBusy ? t('settings.saving') : t('settings.bio.save')}
          </button>
        </div>
      </ProfileSection>

      {ROBEO_BP_MODE ? (
        <ProfileSection title={t('bp.homeDistrict.settingsTitle')}>
          <HomeDistrictPicker />
        </ProfileSection>
      ) : null}

      <ProfileSection title={t('settings.personalisation.title')}>
        <p className="text-xs text-gray-500 mb-4">{t('settings.personalisation.hint')}</p>
        <div className="space-y-4">
          <TagInput
            label={t('settings.personalisation.brands')}
            hint={t('settings.personalisation.brandsHint')}
            values={prefs.feed.brands}
            onChange={(brands) => void persist({ ...prefs, feed: { ...prefs.feed, brands } })}
            placeholder={t('settings.personalisation.brandsPlaceholder')}
          />
          <TagInput
            label={t('settings.personalisation.sizes')}
            hint={t('settings.personalisation.sizesHint')}
            values={prefs.feed.sizes}
            onChange={(sizes) => void persist({ ...prefs, feed: { ...prefs.feed, sizes } })}
            placeholder={t('settings.personalisation.sizesPlaceholder')}
          />
          <TagInput
            label={t('settings.personalisation.styles')}
            hint={t('settings.personalisation.stylesHint')}
            values={prefs.feed.styles}
            onChange={(styles) => void persist({ ...prefs, feed: { ...prefs.feed, styles } })}
            placeholder={t('settings.personalisation.stylesPlaceholder')}
          />
          <div className="flex flex-wrap gap-1.5">
            {STYLE_TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  if (prefs.feed.styles.includes(tag)) return;
                  void persist({
                    ...prefs,
                    feed: { ...prefs.feed, styles: [...prefs.feed.styles, tag].slice(0, 8) },
                  });
                }}
                className="rounded-full border border-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 hover:border-[#007782]/40"
              >
                + {t(`styleTags.${tag}`)}
              </button>
            ))}
          </div>
          <TagInput
            label={t('settings.personalisation.conditions')}
            hint={t('settings.personalisation.conditionsHint')}
            values={prefs.feed.conditions}
            onChange={(conditions) => void persist({ ...prefs, feed: { ...prefs.feed, conditions } })}
            placeholder={t('settings.personalisation.conditionsPlaceholder')}
          />
        </div>
        {saving ? (
          <p className="mt-2 text-[11px] text-gray-400">{t('settings.saving')}</p>
        ) : null}
      </ProfileSection>

      <ProfileSection title={t('settings.notifications.title')}>
        <div className="space-y-2">
          <ChannelToggle
            label={t('settings.notifications.favorites')}
            checked={prefs.notifications.favorites}
            onChange={(favorites) => patchNotifications({ favorites })}
          />
          <ChannelToggle
            label={t('settings.notifications.priceDrops')}
            checked={prefs.notifications.priceDrops}
            onChange={(priceDrops) => patchNotifications({ priceDrops })}
          />
          <ChannelToggle
            label={t('settings.notifications.offers')}
            checked={prefs.notifications.offers}
            onChange={(offers) => patchNotifications({ offers })}
          />
          <ChannelToggle
            label={t('settings.notifications.messages')}
            checked={prefs.notifications.messages}
            onChange={(messages) => patchNotifications({ messages })}
          />
          <ChannelToggle
            label={t('settings.notifications.followers')}
            checked={prefs.notifications.followers}
            onChange={(followers) => patchNotifications({ followers })}
          />
          <ChannelToggle
            label={t('settings.notifications.savedSearches')}
            checked={prefs.notifications.savedSearches}
            onChange={(savedSearches) => patchNotifications({ savedSearches })}
          />
        </div>
      </ProfileSection>

      <ProfileSection title={t('settings.delivery.title')}>
        <p className="text-xs text-gray-500 mb-3">{t('settings.delivery.hint')}</p>
        <div className="space-y-2">
          <PushDeliveryPanel
            pushEnabled={delivery.pushEnabled}
            onPushEnabledChange={(pushEnabled) => {
              const next = { ...delivery, pushEnabled };
              setDelivery(next);
              void saveDeliveryPrefs(supabase, next);
            }}
          />
          <ChannelToggle
            label={t('settings.delivery.email')}
            checked={delivery.emailEnabled}
            onChange={(emailEnabled) => {
              const next = { ...delivery, emailEnabled };
              setDelivery(next);
              void saveDeliveryPrefs(supabase, next);
            }}
          />
          <ChannelToggle
            label={t('settings.delivery.digest')}
            checked={delivery.emailDigest}
            onChange={(emailDigest) => {
              const next = { ...delivery, emailDigest };
              setDelivery(next);
              void saveDeliveryPrefs(supabase, next);
            }}
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-2">{t('settings.delivery.hintEnv')}</p>
      </ProfileSection>

      <ProfileSection title={t('settings.language.title')}>
        <LanguageSwitcher variant="light" className="justify-start" />
      </ProfileSection>

      <ProfileSection title={t('settings.privacy.title')}>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{t('settings.privacy.body')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={gdprBusy || !userId}
            onClick={() => {
              void (async () => {
                setGdprBusy(true);
                try {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  if (!session?.access_token) throw new Error(t('auth.errors.generic'));

                  const res = await fetch('/api/gdpr/export', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Export failed');
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `robeo-gdpr-export-${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success(t('settings.privacy.exportDone'));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : t('auth.errors.generic'));
                } finally {
                  setGdprBusy(false);
                }
              })();
            }}
            className="btn-base btn-secondary text-xs"
          >
            {gdprBusy ? t('settings.saving') : t('settings.privacy.export')}
          </button>
          <button
            type="button"
            disabled={gdprBusy || !userId}
            onClick={() => setDeleteConfirmOpen(true)}
            className="btn-base btn-danger text-xs"
          >
            {t('settings.privacy.deleteAccount')}
          </button>
        </div>
        {deleteConfirmOpen ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm">
            <p className="text-gray-800 mb-3">{t('settings.privacy.deleteConfirm')}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-base btn-danger text-xs"
                disabled={gdprBusy}
                onClick={() => {
                  void (async () => {
                    setGdprBusy(true);
                    try {
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();
                      if (!session?.access_token) throw new Error(t('auth.errors.generic'));

                      const res = await fetch('/api/gdpr/delete-account', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ confirm: true }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Delete failed');
                      toast.success(data.message || t('settings.privacy.deleteDone'));
                      setDeleteConfirmOpen(false);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : t('auth.errors.generic'));
                    } finally {
                      setGdprBusy(false);
                    }
                  })();
                }}
              >
                {t('settings.privacy.deleteConfirmBtn')}
              </button>
              <button
                type="button"
                className="btn-base btn-secondary text-xs"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : null}
      </ProfileSection>
    </div>
  );
}
