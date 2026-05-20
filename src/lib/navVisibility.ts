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
    return false;
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

/** Fő feed / böngészés — a katalógus saját keresőmezője mobilon */
export function isCatalogSearchPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/' || pathname.startsWith('/browse');
}

/** Mobil fejléc: profil menü, ha az alsó tab bar már tartalmazza a Profilt */
export function shouldShowHeaderProfileMenu(
  pathname: string | null,
  loggedIn: boolean,
): boolean {
  if (!loggedIn) return true;
  return !shouldShowMobileBottomNav(pathname, loggedIn);
}
