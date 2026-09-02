import "dotenv/config";
import { serve } from "@hono/node-server";
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

const port = Number(process.env.PORT ?? 4000);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`sgs api listening on http://localhost:${info.port}`);
});

export type AppType = typeof app;
