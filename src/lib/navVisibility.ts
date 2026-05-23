/** Navigáció láthatósága — Vinted-szerű: tab bar fő flow-on, rejtve mély/immersive oldalakon */

const AUTH_PATHS = ['/auth', '/login', '/register'];

/** Alsó tab bar rejtve (mobil) */
const BOTTOM_NAV_SUPPRESSED_PREFIXES = [
  '/messages',
  '/checkout',
  '/upload',
  '/products/',
];

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isBottomNavSuppressedPath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (isAuthPath(pathname)) return true;
  return BOTTOM_NAV_SUPPRESSED_PREFIXES.some(
    (prefix) => pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix),
  );
}

/** Mobil alsó tab bar megjelenjen-e */
export function shouldShowMobileBottomNav(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  if (!pathname || isBottomNavSuppressedPath(pathname)) return false;
  if (!loggedIn) {
    return pathname === '/' || pathname.startsWith('/browse');
  }
  return true;
}

/** Tartalom alsó padding a tab bar magasságához (csak ha a bar látszik mobilon) */
export function shouldPadForMobileBottomNav(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  return shouldShowMobileBottomNav(pathname, loggedIn);
}

/** Keresés tab — teljes kereső/szűrő UI (Vinted: csak /browse, nem a főoldal feed) */
export function isBrowseSearchPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/browse');
}

/** @deprecated — használd isBrowseSearchPath-et */
export function isCatalogSearchPath(pathname: string | null): boolean {
  return isBrowseSearchPath(pathname);
}

/** Mobil: alsó tab bar aktív → fejlécben nincs üzenet/értesítés duplikáció */
export function shouldShowMobileHeaderQuickActions(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  if (!loggedIn) return true;
  return !shouldShowMobileBottomNav(pathname, loggedIn);
}

/** Mobil fejléc: profil menü, ha az alsó tab bar már tartalmazza a Profilt */
export function shouldShowHeaderProfileMenu(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  if (!loggedIn) return true;
  return !shouldShowMobileBottomNav(pathname, loggedIn);
}

/** Mobil: fő tab oldalakon nincs felső navbar — Hacoo-szerű in-page header */
export function shouldHideNavbarOnMobileTabPages(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  return loggedIn && shouldShowMobileBottomNav(pathname, loggedIn);
}

/** Keresés tab mobilon: nincs globális fejléc */
export function shouldHideNavbarOnMobileBrowse(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  return shouldHideNavbarOnMobileTabPages(pathname, loggedIn);
}

/** Immersive böngészés: főoldal feed (bejelentkezve) + keresés tab */
export function isImmersiveBrowsePath(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/browse')) return true;
  if (pathname === '/' && loggedIn) return true;
  return false;
}
