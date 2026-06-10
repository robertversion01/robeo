/** Build azonosító — Vercel git SHA vagy dev fallback. */
export function getAppBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.NEXT_PUBLIC_APP_BUILD_ID?.trim() ||
    'development'
  );
}
