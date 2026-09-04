// The Hono app instance, folded into the merged TanStack Start server —
// same routes/middleware/handlers as the old standalone apps/api, minus the
// @hono/node-server listener (Nitro handles serving now). Mounted at
// /sgs-api/* by routes/sgs-api/$.ts, which strips that prefix before calling
// .fetch() here — see that file for why (Hono's own routes below are
// registered unprefixed, and app.basePath() can't retroactively rewrite
// already-registered routes).
import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors.js";
import { loggerMiddleware } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { adminAuthRoute } from "./modules/admin-auth/route.js";
import { clientsRoute } from "./modules/clients/route.js";
import { itemsRoute } from "./modules/items/route.js";
import { requestsRoute } from "./modules/requests/route.js";
import { paymentsRoute } from "./modules/payments/route.js";
import { usersRoute } from "./modules/users/route.js";
import { publicRoute } from "./modules/public/route.js";
import { aiRoute } from "./modules/ai/route.js";
import { uploadsRoute } from "./modules/uploads/route.js";

const app = new Hono();

app.use("*", loggerMiddleware);
app.use("*", corsMiddleware);
app.onError(errorHandler);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/admin-auth", adminAuthRoute);
app.route("/clients", clientsRoute);
app.route("/items", itemsRoute);
app.route("/requests", requestsRoute);
app.route("/payments", paymentsRoute);
app.route("/users", usersRoute);
app.route("/public", publicRoute);
app.route("/ai", aiRoute);
app.route("/uploads", uploadsRoute);

export type AppType = typeof app;
export { app as apiApp };
