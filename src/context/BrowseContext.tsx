'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type BrowseContextValue = {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
};

const BrowseContext = createContext<BrowseContextValue | null>(null);

export function BrowseProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const value = useMemo(
    () => ({ searchQuery, setSearchQuery }),
    [searchQuery]
  );
  return (
    <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>
  );
}

export function useBrowseSearch() {
  const ctx = useContext(BrowseContext);
  if (!ctx) {
    throw new Error('useBrowseSearch must be used within BrowseProvider');
  }
  return ctx;
}
