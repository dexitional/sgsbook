// PM2 process definition for the merged app — build once, run the built
// output under PM2 with plain node.
//
// Unlike the old standalone apps/api, this no longer needs the tsx
// workaround: Hono's modules are now part of apps/app's own Vite/Nitro
// build, which fully bundles workspace deps (including @sgs/db, which is
// TypeScript-source-only) the same way apps/web's server functions already
// did — so .output/server/index.mjs is self-contained, same as any other
// Nitro node-server build.
//
// apps/app/.env.production is the source of truth for runtime secrets
// (the union of what used to be split across apps/web, apps/admin, and
// apps/api's own .env.production files); this file only loads and hands
// them to PM2 (nothing here is committed with real values).
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
      name: "sgs-app",
      cwd: path.join(__dirname, "apps/app/.output/server"),
      script: "index.mjs",
      env: { PORT: "3000", ...loadEnv("apps/app/.env.production") },
    },
  ],
};
