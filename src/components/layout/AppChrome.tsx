'use client';

import { BrowseProvider } from '@/context/BrowseContext';
import { AppVersionProvider } from '@/context/AppVersionContext';
import VersionedAppShell from '@/components/version/VersionedAppShell';
import I18nProvider from '@/providers/I18nProvider';
import AuthRefreshHandler from '@/components/auth/AuthRefreshHandler';
import ProfileActivityHeartbeat from '@/components/auth/ProfileActivityHeartbeat';
import DeployRefreshNotifier from '@/components/version/DeployRefreshNotifier';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppVersionProvider>
        <BrowseProvider>
          <AuthRefreshHandler />
          <ProfileActivityHeartbeat />
          <DeployRefreshNotifier />
          <VersionedAppShell>{children}</VersionedAppShell>
        </BrowseProvider>
      </AppVersionProvider>
    </I18nProvider>
  );
}
