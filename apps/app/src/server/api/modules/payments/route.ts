import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ADMIN_ONLY } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { listPaymentsQuerySchema, recordPaymentSchema } from "./schema.js";
import * as service from "./service.js";

export const paymentsRoute = new Hono()
  .use("*", requireAdminRole(ADMIN_ONLY))
  .get("/", zValidator("query", listPaymentsQuerySchema), async (c) => {
    const result = await service.listPayments(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    if (!id) throw new AppError("Missing payment id.", 400);
    const payment = await service.getPayment(id);
    if (!payment) throw new AppError("Payment not found.", 404);
    return c.json({ payment });
  })
  .post("/", zValidator("json", recordPaymentSchema), async (c) => {
    const admin = c.get("adminUser");
    const payment = await service.recordPayment(c.req.valid("json"), admin.id);
    return c.json({ payment }, 201);
  });
