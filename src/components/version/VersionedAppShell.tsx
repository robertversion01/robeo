'use client';

import { useAppVersion } from '@/context/AppVersionContext';
import AppVersionToggle from '@/components/version/AppVersionToggle';
import V1AppViewport from '@/components/version/V1AppViewport';
import V2AppViewport from '@/components/version/V2AppViewport';

export default function VersionedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { version } = useAppVersion();

  return (
    <div className="relative flex w-full min-h-0 flex-1 flex-col">
      <AppVersionToggle />
      {version === 'v1' ? (
        <V1AppViewport>{children}</V1AppViewport>
      ) : (
        <V2AppViewport />
      )}
    </div>
  );
}
