import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ANY_STAFF, STAFF } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { createRequestSchema, listRequestsQuerySchema, updateStatusSchema } from "./schema.js";
import * as service from "./service.js";

export const requestsRoute = new Hono()
  .get("/", requireAdminRole(ANY_STAFF), zValidator("query", listRequestsQuerySchema), async (c) => {
    const result = await service.listRequests(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", requireAdminRole(ANY_STAFF), async (c) => {
    const id = c.req.param("id");
    if (!id) throw new AppError("Missing request id.", 400);
    const request = await service.getRequest(id);
    if (!request) throw new AppError("Request not found.", 404);
    return c.json({ request });
  })
  .post("/", requireAdminRole(STAFF), zValidator("json", createRequestSchema), async (c) => {
    const admin = c.get("adminUser");
    const request = await service.createRequest(c.req.valid("json"), admin.id);
    return c.json({ request }, 201);
  })
  .patch("/:id/status", requireAdminRole(STAFF), zValidator("json", updateStatusSchema), async (c) => {
    const request = await service.updateStatus(c.req.param("id"), c.req.valid("json"));
    return c.json({ request });
  });
