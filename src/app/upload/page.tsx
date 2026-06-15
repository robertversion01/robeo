'use client';

import { Suspense } from 'react';
import UploadWizard from '@/components/upload/UploadWizard';
import UploadErrorBoundary from '@/components/upload/UploadErrorBoundary';

function UploadPageInner() {
  return (
    <UploadErrorBoundary>
      <UploadWizard />
    </UploadErrorBoundary>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={null}>
      <UploadPageInner />
    </Suspense>
  );
}
