import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ADMIN_ONLY, STAFF } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { createItemSchema, listItemsQuerySchema, updateItemSchema } from "./schema.js";
import * as service from "./service.js";

export const itemsRoute = new Hono()
  .get("/", requireAdminRole(STAFF), zValidator("query", listItemsQuerySchema), async (c) => {
    const result = await service.listItems(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", requireAdminRole(STAFF), async (c) => {
    const id = c.req.param("id");
    if (!id) throw new AppError("Missing item id.", 400);
    const item = await service.getItem(id);
    if (!item) throw new AppError("Item not found.", 404);
    return c.json({ item });
  })
  .post("/", requireAdminRole(ADMIN_ONLY), zValidator("json", createItemSchema), async (c) => {
    const item = await service.createItem(c.req.valid("json"));
    return c.json({ item }, 201);
  })
  .patch("/:id", requireAdminRole(ADMIN_ONLY), zValidator("json", updateItemSchema), async (c) => {
    const item = await service.updateItem(c.req.param("id"), c.req.valid("json"));
    return c.json({ item });
  })
  .delete("/:id", requireAdminRole(ADMIN_ONLY), async (c) => {
    const id = c.req.param("id");
    if (!id) throw new AppError("Missing item id.", 400);
    await service.deleteItem(id);
    return c.body(null, 204);
  });
