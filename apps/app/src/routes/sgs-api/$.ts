import { createFileRoute } from "@tanstack/react-router";
import { apiApp } from "#/server/api/app";

// Hono's routes (app.route("/clients", ...) etc. in server/api/app.ts) are
// registered unprefixed, and Hono's own app.basePath() can't retroactively
// rewrite routes already registered on the instance — so the /sgs-api
// prefix is stripped here instead, exactly like the old standalone
// deployment's nginx `location /sgs-api/ { proxy_pass .../ }` rule did.
// Moved from nginx into code, not new logic.
export const Route = createFileRoute("/sgs-api/$")({
  server: {
    handlers: {
      ANY: ({ request }) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.replace(/^\/sgs-api/, "") || "/";
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
