/** Chat — rendelés / szállítás panel megnyitása és címke nyomtatás kérése. */

export const ORDER_PANEL_FOCUS_EVENT = 'order-panel:focus';
export const ORDER_PANEL_PRINT_EVENT = 'order-panel:print-label';

export type OrderPanelActionResult = {
  panelFound: boolean;
};

export function focusOrderPanel(): boolean {
  if (typeof window === 'undefined') return false;
  const el = document.getElementById('chat-shipping-panel');
  if (!el) {
    window.dispatchEvent(new CustomEvent(ORDER_PANEL_FOCUS_EVENT));
    return false;
  }

  try {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    el.scrollIntoView();
  }

  try {
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });
  } catch {
    /* older browsers ignore options */
  }

  el.classList.add('ring-2', 'ring-[#007782]', 'ring-offset-2', 'shadow-lg');
  window.setTimeout(() => {
    el.classList.remove('ring-2', 'ring-[#007782]', 'ring-offset-2', 'shadow-lg');
  }, 2200);
  window.dispatchEvent(new CustomEvent(ORDER_PANEL_FOCUS_EVENT));
  return true;
}

export function requestPrintLabel(productId?: string | null): OrderPanelActionResult {
  if (typeof window === 'undefined') return { panelFound: false };
  const panelFound = focusOrderPanel();
  window.dispatchEvent(
    new CustomEvent(ORDER_PANEL_PRINT_EVENT, {
      detail: { productId: productId ?? null, panelFound },
    }),
  );
  return { panelFound };
}

/** @deprecated use focusOrderPanel */
export const scrollToOrderPanel = focusOrderPanel;
