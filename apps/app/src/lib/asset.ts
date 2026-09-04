// This app deploys at the domain root (Vite `base: '/'`), so this currently
// just resolves to the plain path — kept as a helper rather than reverted
// to hardcoded strings since call sites already use it consistently, and
// it costs nothing to keep working correctly if a path-prefixed deploy
// ever comes back (it did once already, for the old ehub.ucc.edu.gh setup).
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
