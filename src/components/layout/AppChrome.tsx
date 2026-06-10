'use client';

import { BrowseProvider } from '@/context/BrowseContext';
import { AppVersionProvider } from '@/context/AppVersionContext';
import VersionedAppShell from '@/components/version/VersionedAppShell';
import I18nProvider from '@/providers/I18nProvider';
import AuthRefreshHandler from '@/components/auth/AuthRefreshHandler';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppVersionProvider>
        <BrowseProvider>
          <AuthRefreshHandler />
          <VersionedAppShell>{children}</VersionedAppShell>
        </BrowseProvider>
      </AppVersionProvider>
    </I18nProvider>
  );
}
