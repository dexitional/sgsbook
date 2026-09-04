import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { ADMIN_ONLY } from "../../lib/roles.js";
import { askInsightsSchema } from "./schema.js";
import * as service from "./service.js";

export const aiRoute = new Hono()
  .use("*", requireAdminRole(ADMIN_ONLY))
  .get("/history", async (c) => {
    const admin = c.get("adminUser");
    const messages = await service.listHistory(admin.id);
    return c.json({ messages });
  })
  .post("/ask", zValidator("json", askInsightsSchema), async (c) => {
    const { question, history } = c.req.valid("json");
    const admin = c.get("adminUser");

    return streamSSE(c, async (stream) => {
      try {
        for await (const event of service.streamInsights(question, admin.id, history)) {
          await stream.writeSSE({ data: JSON.stringify(event) });
        }
      } catch (err) {
        console.error(err);
        await stream.writeSSE({ data: JSON.stringify({ type: "error", message: "Something went wrong." }) });
      }
    });
  });
