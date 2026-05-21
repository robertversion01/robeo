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
import {
  isPushSupported,
  subscribeToWebPush,
  unsubscribeFromWebPush,
} from '@/lib/webPushClient';
import { toast } from 'sonner';

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
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [gdprBusy, setGdprBusy] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [p, d] = await Promise.all([
      loadUserPreferences(supabase),
      loadDeliveryPrefs(supabase),
    ]);
    setPrefs(p);
    setDelivery(d);
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

  return (
    <div className="space-y-6">
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
          <ChannelToggle
            label={t('settings.delivery.push')}
            checked={delivery.pushEnabled}
            onChange={(pushEnabled) => {
              void (async () => {
                if (pushEnabled) {
                  if (!isPushSupported()) {
                    setPushStatus(t('settings.delivery.pushUnsupported'));
                    return;
                  }
                  const sub = await subscribeToWebPush();
                  if (!sub.ok) {
                    setPushStatus(t('settings.delivery.pushFailed'));
                    return;
                  }
                  setPushStatus(t('settings.delivery.pushReady'));
                } else {
                  await unsubscribeFromWebPush();
                  setPushStatus(null);
                }
                const next = { ...delivery, pushEnabled };
                setDelivery(next);
                await saveDeliveryPrefs(supabase, next);
              })();
            }}
          />
          {pushStatus ? (
            <p className="text-[11px] text-gray-600 mt-1">{pushStatus}</p>
          ) : null}
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
