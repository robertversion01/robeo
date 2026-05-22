'use client';

import React from 'react';
import { clearUploadDraft, purgeCorruptUploadDrafts } from '@/lib/uploadDraft';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class UploadErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[upload] render error', error);
    purgeCorruptUploadDrafts();
  }

  private reset = () => {
    purgeCorruptUploadDrafts();
    clearUploadDraft();
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-lg font-bold text-gray-900">A feltöltés oldal nem töltődött be</h1>
          <p className="text-sm text-gray-600">
            Gyakran régi mentett piszkozat vagy túl nagy kép okozza mobilon. Töröljük a piszkozatot és
            újrapróbáljuk.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="btn-base btn-primary min-h-12 px-6"
          >
            Piszkozat törlése és újra
          </button>
        </div>
      </div>
    );
  }
}
