import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { calendarQuerySchema } from "./schema.js";
import * as service from "./service.js";

// No auth middleware on this router — intentionally public. Every query here
// must stay PII-safe (see service.ts); never add a client/contact relation.
export const publicRoute = new Hono()
  .get("/items", async (c) => {
    const items = await service.listPublicFacilities();
    return c.json({ items });
  })
  .get("/calendar", zValidator("query", calendarQuerySchema), async (c) => {
    const { from, to } = c.req.valid("query");
    const bookings = await service.listPublicCalendar(from, to);
    return c.json({ bookings });
  });
