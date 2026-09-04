import { createFileRoute } from "@tanstack/react-router";
import { apiApp } from "#/server/api/app";

// Hono's routes (app.route("/clients", ...) etc. in server/api/app.ts) are
// registered unprefixed, and Hono's own app.basePath() can't retroactively
// rewrite routes already registered on the instance — so the /api prefix
// is stripped here before handing off to it.
//
// This coexists with routes/api/auth/$.ts (better-auth, kept at its
// conventional /api/auth/* path) because TanStack Router matches the more
// specific static segment ("auth") before falling through to this broader
// splat — same coexistence already proven by the customer/admin print
// routes living at parallel paths.
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      ANY: ({ request }) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.replace(/^\/api/, "") || "/";
        const rewritten = new Request(url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          // Node's fetch requires this when a Request is constructed with a
          // streaming body.
          duplex: "half",
        } as RequestInit & { duplex: "half" });
        return apiApp.fetch(rewritten);
      },
    },
  },
});
