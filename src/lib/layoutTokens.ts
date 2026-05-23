/** Desktop / legacy top offset (navbar látszik) */
export const DESKTOP_TOP_PADDING = 'md:pt-14';

/** Mobil tab oldalak teteje — nincs navbar, csak safe area + kis lélegzet */
export const MOBILE_TAB_PAGE_TOP =
  'pt-[calc(0.75rem+env(safe-area-inset-top,0px))]';

/** Egységes felső padding: mobilon tab-safe, desktopon navbar */
export const MAIN_TOP_PADDING = `${MOBILE_TAB_PAGE_TOP} ${DESKTOP_TOP_PADDING}`;

/** Mobil bottom tab bar belső magasság (Hacoo: ~56px, kompakt) */
export const MOBILE_BOTTOM_NAV_INNER = '3.5rem';

/** Extra scroll buffer a tab bar felett */
export const MOBILE_SCROLL_BUFFER = '1.25rem';

/** Tab bar teljes magasság (belső sor + safe area) */
export const MOBILE_BOTTOM_NAV_HEIGHT = `calc(${MOBILE_BOTTOM_NAV_INNER} + env(safe-area-inset-bottom, 0px))`;

/** Tartalom alsó padding tab bar + buffer + safe area */
export const MOBILE_PAGE_BOTTOM_CLASS =
  'pb-[calc(3.5rem+1.25rem+env(safe-area-inset-bottom,0px))] md:pb-12';

/** @deprecated — használd MOBILE_PAGE_BOTTOM_CLASS-et */
export const MOBILE_PAGE_BOTTOM = MOBILE_PAGE_BOTTOM_CLASS;

/** V1AppViewport wrapper — egyetlen globális alsó padding mobilon */
export const MOBILE_WRAPPER_BOTTOM_PAD =
  'pb-[calc(3.5rem+1.25rem+env(safe-area-inset-bottom,0px))] md:pb-0';

/** JS positioning: tab bar belső + scroll buffer (px) */
export const MOBILE_BOTTOM_NAV_RESERVE_PX = 74;

/** Sticky alsó action sáv (checkout, upload wizard) */
export const STICKY_ACTION_BAR_CLASS =
  'fixed bottom-0 left-0 right-0 z-[9990] border-t border-gray-200 bg-white/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)]';

/** Dropdown / portal reserve: sticky action bar + kis buffer (px) */
export const STICKY_ACTION_BAR_RESERVE_PX = 96;

/** PDP sticky CTA alsó padding (nincs tab bar a /products/ alatt) */
export const MOBILE_PRODUCT_STICKY_CTA_PAD = 'max-md:pb-44';

/** Minimális tap target (44px) */
export const TOUCH_TARGET = 'min-h-11 min-w-11 touch-manipulation';
