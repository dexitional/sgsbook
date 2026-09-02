# Build context must be the monorepo root (see docker-compose.yml).
FROM node:20-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci

FROM deps AS build
COPY . .
ARG DATABASE_URL=mysql://build:build@build/build
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate -w packages/db
# VITE_API_URL is read via `import.meta.env` in browser-side code, so Vite
# bakes it into the client bundle at build time — it must be the public API
# origin here, not something set later at container runtime.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w apps/web

# Nitro's node-server preset output is self-contained (it bundles workspace
# deps like @sgs/ui/@sgs/db and vendors any native bits into its own
# node_modules), so the runtime image only needs .output/, not the repo.
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.output/server ./
COPY --from=build /repo/apps/web/.output/public ./public
EXPOSE 3000
CMD ["node", "index.mjs"]
