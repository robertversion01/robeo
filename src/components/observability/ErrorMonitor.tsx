'use client';

import { useEffect } from 'react';
import { installGlobalErrorMonitor } from '@/lib/clientErrorReporter';

/** Globalis JS hibak es kezeletlen promise rejectionok naplozasa (lokalis). */
export default function ErrorMonitor() {
  useEffect(() => {
    const uninstall = installGlobalErrorMonitor();
    return uninstall;
  }, []);

  return null;
}
