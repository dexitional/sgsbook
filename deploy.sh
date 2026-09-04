#!/usr/bin/env bash
# Bare-metal PM2 deploy — run this instead of the individual steps by hand.
# Usage: ./deploy.sh   (from the repo root, e.g. /var/www/html/sgsbook)
set -euo pipefail
cd "$(dirname "$0")"

echo "==> git pull"
git pull

echo "==> npm ci"
npm ci

echo "==> prisma generate"
# Export DATABASE_URL directly into this process instead of relying on
# prisma.config.ts's dotenv/config to find packages/db/.env on its own —
# that file-lookup depends on cwd matching exactly, which has been a
# recurring source of "Cannot resolve environment variable" failures.
set -a
source apps/app/.env.production
set +a
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is empty after sourcing apps/app/.env.production — fix that file first" >&2
  exit 1
fi
npm run db:generate -w packages/db

echo "==> prisma migrate deploy"
npm run db:deploy -w packages/db

echo "==> build apps/app"
# env vars used at build time (DATABASE_URL for prisma generate above,
# already exported) are already in this shell's environment via the
# source above — no separate VITE_API_URL/VITE_BASE_PATH needed anymore,
# the merged app calls /sgs-api as a same-origin relative path and builds
# with a fixed base of "/".
npm run build -w apps/app

echo "==> verify build output exists before touching pm2"
test -f apps/app/.output/server/index.mjs || { echo "build missing .output/server/index.mjs" >&2; exit 1; }
test -f packages/db/prisma/generated/client/client.js || { echo "prisma client was not generated" >&2; exit 1; }

echo "==> pm2 reload"
pm2 startOrReload ecosystem.config.cjs
pm2 save

echo "==> done"
pm2 list
