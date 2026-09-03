// Vite's `base` config (set to "/sgs/" for the path-prefixed production
// deploy) only rewrites URLs for assets that go through its build pipeline
// (imports, <link href={appCss}>). A literal string like `src="/logo.webp"`
// bypasses that entirely and always resolves against the domain root, which
// 404s once this app is served from a sub-path — use this for any reference
// to a file in public/.
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
