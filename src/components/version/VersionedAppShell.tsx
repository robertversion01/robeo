'use client';

import V1AppViewport from '@/components/version/V1AppViewport';

/** Kanonikus v1 felület — v2 kapcsoló nélkül. */
export default function VersionedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <V1AppViewport>{children}</V1AppViewport>;
}
