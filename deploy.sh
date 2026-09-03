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
source apps/api/.env.production
set +a
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is empty after sourcing apps/api/.env.production — fix that file first" >&2
  exit 1
fi
npm run db:generate -w packages/db

echo "==> prisma migrate deploy"
npm run db:deploy -w packages/db

echo "==> build apps/web (VITE_API_URL/DATABASE_URL from apps/web/.env.production)"
set -a
source apps/web/.env.production
set +a
npm run build -w apps/web

echo "==> build apps/admin (VITE_API_URL from apps/admin/.env.production)"
set -a
source apps/admin/.env.production
set +a
npm run build -w apps/admin

echo "==> verify build outputs exist before touching pm2"
test -f apps/web/.output/server/index.mjs || { echo "web build missing .output/server/index.mjs" >&2; exit 1; }
test -f apps/admin/.output/server/index.mjs || { echo "admin build missing .output/server/index.mjs" >&2; exit 1; }
test -f packages/db/prisma/generated/client/client.js || { echo "prisma client was not generated" >&2; exit 1; }

echo "==> pm2 reload"
pm2 startOrReload ecosystem.config.cjs
pm2 save

echo "==> done"
pm2 list
