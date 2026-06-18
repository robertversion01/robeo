'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSuppressNativeImageMenu } from '@/hooks/useSuppressNativeImageMenu';
import ProductImageViewer from '@/components/product/ProductImageViewer';

type ViewerPayload = {
  images: string[];
  initialIndex?: number;
  productName?: string;
};

type FeedImageViewerContextValue = {
  isOpen: boolean;
  openViewer: (payload: ViewerPayload) => void;
  closeViewer: () => void;
};

const FeedImageViewerContext = createContext<FeedImageViewerContextValue>({
  isOpen: false,
  openViewer: () => {},
  closeViewer: () => {},
});

export function useFeedImageViewer() {
  return useContext(FeedImageViewerContext);
}

export function FeedImageViewerProvider({ children }: { children: ReactNode }) {
  useSuppressNativeImageMenu();
  const [state, setState] = useState<ViewerPayload & { open: boolean }>({
    open: false,
    images: [],
    initialIndex: 0,
    productName: '',
  });

  const openViewer = useCallback((payload: ViewerPayload) => {
    setState({
      open: true,
      images: payload.images,
      initialIndex: payload.initialIndex ?? 0,
      productName: payload.productName ?? '',
    });
  }, []);

  const closeViewer = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(
    () => ({
      isOpen: state.open,
      openViewer,
      closeViewer,
    }),
    [state.open, openViewer, closeViewer],
  );

  return (
    <FeedImageViewerContext.Provider value={value}>
      {children}
      <ProductImageViewer
        images={state.images}
        initialIndex={state.initialIndex}
        open={state.open}
        onClose={closeViewer}
        productName={state.productName}
      />
    </FeedImageViewerContext.Provider>
  );
}
