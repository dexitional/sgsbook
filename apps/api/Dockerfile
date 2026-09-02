# Build context must be the monorepo root (see docker-compose.yml), so
# workspace deps (@sgs/db) resolve correctly under npm workspaces.
FROM node:20-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci

FROM deps AS runtime
WORKDIR /repo
COPY . .
# prisma.config.ts resolves DATABASE_URL eagerly even for `generate` (which
# doesn't need a reachable DB, just a set env var) — any well-formed value
# works here.
ARG DATABASE_URL=mysql://build:build@build/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate -w packages/db

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 4000
# @sgs/db ships as TypeScript source (no build step of its own), so plain
# `node` can't resolve it even after `tsc` compiles apps/api itself — run
# directly through tsx instead, in both dev and prod, to keep one code path.
CMD ["npx", "tsx", "src/index.ts"]
