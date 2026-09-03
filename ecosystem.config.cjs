// PM2 process definitions for the bare-metal deploy — build once, then run
// the built output under PM2 instead of `vite dev`/`tsx watch`.
//
// apps/web and apps/admin are TanStack Start (Nitro) apps: `npm run build`
// produces a self-contained `.output/server/index.mjs` — PM2 just runs that
// directly with plain node, no interpreter tricks needed.
//
// apps/api has no viable "build once, run with plain node" path: @sgs/db is
// TypeScript-only (no build step of its own), so even after `tsc` compiles
// apps/api itself, plain `node dist/index.js` can't resolve the `@sgs/db`
// import (confirmed: throws ERR_MODULE_NOT_FOUND). Same fix as the Docker
// setup — run it through `tsx` directly, in prod as in dev.
//
// Each app's own `apps/*/.env.production` is the source of truth for its
// runtime secrets; this file only loads and hands them to PM2 (nothing here
// is committed with real values).
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadEnv(relPath) {
  const full = path.join(__dirname, relPath);
  return fs.existsSync(full) ? dotenv.parse(fs.readFileSync(full)) : {};
}

module.exports = {
  apps: [
    {
      name: "sgs-api",
      cwd: path.join(__dirname, "apps/api"),
      script: path.join(__dirname, "node_modules/.bin/tsx"),
      args: "src/index.ts",
      env: loadEnv("apps/api/.env.production"),
    },
    {
      name: "sgs-web",
      cwd: path.join(__dirname, "apps/web/.output/server"),
      script: "index.mjs",
      env: { PORT: "3000", ...loadEnv("apps/web/.env.production") },
    },
    {
      name: "sgs-admin",
      cwd: path.join(__dirname, "apps/admin/.output/server"),
      script: "index.mjs",
      env: { PORT: "3001", ...loadEnv("apps/admin/.env.production") },
    },
  ],
};
