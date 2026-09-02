# Build context must be the monorepo root (see docker-compose.yml).
FROM node:20-bookworm-slim AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
RUN npm ci

FROM deps AS build
COPY . .
# VITE_API_URL is read via `import.meta.env` in browser-side code, so Vite
# bakes it into the client bundle at build time — it must be the public API
# origin here, not something set later at container runtime. Admin never
# talks to the DB directly (only apps/api does), so no DATABASE_URL/prisma
# generate step is needed for this build.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w apps/admin

# Nitro's node-server preset output is self-contained (it bundles workspace
# deps like @sgs/ui), so the runtime image only needs .output/, not the repo.
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/admin/.output/server ./
COPY --from=build /repo/apps/admin/.output/public ./public
EXPOSE 3000
CMD ["node", "index.mjs"]
