import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
      rollupConfig: { external: [/^@sentry\//] },
      routeRules: {
        // Landing page embeds live data (facilities, this week's approved
        // bookings) via SSR query dehydration — a pure build-time-only
        // static export would freeze that at deploy time and go stale the
        // moment a booking is approved. Instead cache the rendered response
        // for a short window with stale-while-revalidate: near-instant for
        // almost every request, while a background refresh keeps the data
        // from ever drifting more than a minute from reality. Nothing
        // viewer-specific gets embedded in this HTML (auth/session state
        // resolves client-side via authClient.useSession(), after
        // hydration), so it's safe to share one cached response across
        // visitors.
        "/": { swr: 60 },
        // Vite's hashed build output (content-addressed filenames) is safe
        // to cache forever — a content change always produces a new
        // filename, never the same URL serving different bytes.
        "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
        // Unhashed static files under public/ — same URL could serve
        // different bytes after a future replace, so cache long but not
        // "immutable"; browsers will still revalidate on the next visit
        // after this window elapses.
        "/logo.webp": { headers: { "cache-control": "public, max-age=604800" } },
        "/banner.webp": { headers: { "cache-control": "public, max-age=604800" } },
      },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
