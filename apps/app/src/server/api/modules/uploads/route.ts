import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { requireAdminRole } from "../../middleware/requireAdminRole.js";
import { STAFF } from "../../lib/roles.js";
import { presignSchema } from "./schema.js";
import * as service from "./service.js";

// Only issues a presigned PUT URL — the actual file bytes go straight from
// the browser to R2, never through this server.
export const uploadsRoute = new Hono()
  .use("*", requireAdminRole(STAFF))
  .post("/presign", zValidator("json", presignSchema), async (c) => {
    const result = await service.presignUpload(c.req.valid("json"));
    return c.json(result);
  });
