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

export const updateStatusSchema = z
  .object({
    status: z.enum(["PENDED", "REJECTED", "APPROVED", "COMPLETED"]),
    // Sent to the customer by email + SMS; required when rejecting.
    reason: z.string().max(650).optional(),
  })
  .refine((v) => v.status !== "REJECTED" || (v.reason?.trim().length ?? 0) > 0, {
    message: "A reason is required when rejecting a request.",
    path: ["reason"],
  });

// Reschedule: move to a new period, re-priced on that period only.
export const rescheduleRequestSchema = z.object({
  reason: z.string().trim().min(1).max(650),
  packages: z
    .array(z.object({ packageId: z.string().min(1), bookStart: z.coerce.date(), bookEnd: z.coerce.date() }))
    .min(1),
});

// Extension: start stays, end moves later, extra days added to the total.
export const extendRequestSchema = z.object({
  reason: z.string().trim().min(1).max(650),
  packages: z.array(z.object({ packageId: z.string().min(1), bookEnd: z.coerce.date() })).min(1),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(["PENDED", "REJECTED", "APPROVED", "COMPLETED"]).optional(),
  clientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
