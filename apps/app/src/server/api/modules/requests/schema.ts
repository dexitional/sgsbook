import { z } from "zod";

export const packageInputSchema = z.object({
  itemId: z.string().min(1),
  bookStart: z.coerce.date(),
  bookEnd: z.coerce.date(),
  addonItemIds: z.array(z.string()).optional(),
});

export const createRequestSchema = z.object({
  clientId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  // No chargeAmount here — it's computed server-side from each package's
  // facility/addon unit prices × days booked, not entered manually.
  packages: z.array(packageInputSchema).min(1),
});

export const updateStatusSchema = z.object({
  status: z.enum(["PENDED", "REJECTED", "APPROVED", "COMPLETED"]),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(["PENDED", "REJECTED", "APPROVED", "COMPLETED"]).optional(),
  clientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
