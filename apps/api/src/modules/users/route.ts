import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ADMIN_ONLY } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { createRoleSchema, createUserSchema, listUsersQuerySchema, updateUserSchema } from "./schema.js";
import * as service from "./service.js";

// Only administrators can manage other staff accounts and roles.
export const usersRoute = new Hono()
  .use("*", requireAdminRole(ADMIN_ONLY))
  .get("/", zValidator("query", listUsersQuerySchema), async (c) => {
    const result = await service.listUsers(c.req.valid("query"));
    return c.json(result);
  })
  .post("/", zValidator("json", createUserSchema), async (c) => {
    const user = await service.createUser(c.req.valid("json"));
    return c.json({ user }, 201);
  })
  .get("/roles", async (c) => {
    const roles = await service.listRoles();
    return c.json({ roles });
  })
  .post("/roles", zValidator("json", createRoleSchema), async (c) => {
    const role = await service.createRole(c.req.valid("json"));
    return c.json({ role }, 201);
  })
  .patch("/:id", zValidator("json", updateUserSchema), async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) throw new AppError("Invalid user id.", 400);
    const user = await service.updateUser(id, c.req.valid("json"));
    return c.json({ user });
  })
  .delete("/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) throw new AppError("Invalid user id.", 400);
    await service.deleteUser(id, c.get("adminUser").id);
    return c.body(null, 204);
  });
