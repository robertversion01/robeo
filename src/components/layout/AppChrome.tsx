'use client';

import { BrowseProvider } from '@/context/BrowseContext';
import { AppVersionProvider } from '@/context/AppVersionContext';
import VersionedAppShell from '@/components/version/VersionedAppShell';

export default function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppVersionProvider>
      <BrowseProvider>
        <VersionedAppShell>{children}</VersionedAppShell>
      </BrowseProvider>
    </AppVersionProvider>
  );
}
