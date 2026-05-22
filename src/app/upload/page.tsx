'use client';

import UploadWizard from '@/components/upload/UploadWizard';
import UploadErrorBoundary from '@/components/upload/UploadErrorBoundary';

export default function UploadPage() {
  return (
    <UploadErrorBoundary>
      <UploadWizard />
    </UploadErrorBoundary>
  );
}
