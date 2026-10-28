import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ADMIN_ONLY, ANY_STAFF } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { createBlockedDateSchema, listBlockedDatesQuerySchema } from "./schema.js";
import * as service from "./service.js";

export const blockedDatesRoute = new Hono()
  .get("/", requireAdminRole(ANY_STAFF), zValidator("query", listBlockedDatesQuerySchema), async (c) => {
    const result = await service.listBlockedDates(c.req.valid("query"));
    return c.json(result);
  })
  .post("/", requireAdminRole(ADMIN_ONLY), zValidator("json", createBlockedDateSchema), async (c) => {
    const admin = c.get("adminUser");
    const result = await service.createBlockedDate(c.req.valid("json"), admin.id);
    return c.json(result, 201);
  })
  .delete("/:id", requireAdminRole(ADMIN_ONLY), async (c) => {
    const id = c.req.param("id");
    if (!id) throw new AppError("Missing blocked date id.", 400);
    await service.deleteBlockedDate(id);
    return c.body(null, 204);
  });
