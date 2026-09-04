import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { STAFF } from "../../lib/roles.js";
import { AppError } from "../../middleware/error-handler.js";
import { contactPersonSchema, createClientSchema, listClientsQuerySchema, updateClientSchema } from "./schema.js";
import * as service from "./service.js";

export const clientsRoute = new Hono()
  .use("*", requireAdminRole(STAFF))
  .get("/", zValidator("query", listClientsQuerySchema), async (c) => {
    const result = await service.listClients(c.req.valid("query"));
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const client = await service.getClient(c.req.param("id"));
    if (!client) throw new AppError("Client not found.", 404);
    return c.json({ client });
  })
  .post("/", zValidator("json", createClientSchema), async (c) => {
    const client = await service.createClient(c.req.valid("json"));
    return c.json({ client }, 201);
  })
  .patch("/:id", zValidator("json", updateClientSchema), async (c) => {
    const client = await service.updateClient(c.req.param("id"), c.req.valid("json"));
    return c.json({ client });
  })
  .post("/:id/contacts", zValidator("json", contactPersonSchema), async (c) => {
    const contact = await service.addContact(c.req.param("id"), c.req.valid("json"));
    return c.json({ contact }, 201);
  })
  .patch("/:id/contacts/:contactId", zValidator("json", contactPersonSchema.partial()), async (c) => {
    const contact = await service.updateContact(c.req.param("contactId"), c.req.valid("json"));
    return c.json({ contact });
  })
  .delete("/:id/contacts/:contactId", async (c) => {
    await service.removeContact(c.req.param("contactId"));
    return c.json({ ok: true });
  });
