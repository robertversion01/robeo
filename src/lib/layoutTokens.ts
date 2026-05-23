/** Egységes felső padding a mobil navbarhoz */

export const MAIN_TOP_PADDING = 'pt-12 md:pt-14';



/** Mobil bottom tab bar: egy sor (~3.75rem) + safe area */

export const MOBILE_BOTTOM_NAV_HEIGHT = 'calc(3.75rem + env(safe-area-inset-bottom, 0px))';



export const MOBILE_PAGE_BOTTOM = `pb-[${MOBILE_BOTTOM_NAV_HEIGHT}] md:pb-12`;



/** Tailwind arbitrary value — használd className-ben közvetlenül */

export const MOBILE_PAGE_BOTTOM_CLASS =

  'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))] md:pb-12';



/** Sticky alsó action sáv (checkout, upload wizard) */

export const STICKY_ACTION_BAR_CLASS =

  'fixed bottom-0 left-0 right-0 z-[9990] border-t border-gray-200 bg-white/95 backdrop-blur-lg px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.08)]';

/** Dropdown / portal reserve: sticky action bar + kis buffer (px) */
export const STICKY_ACTION_BAR_RESERVE_PX = 96;



/** Minimális tap target (44px) */

export const TOUCH_TARGET = 'min-h-11 min-w-11 touch-manipulation';

