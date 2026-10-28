import { z } from "zod";

export const createBlockedDateSchema = z
  .object({
    // Omitted/null blocks every facility.
    itemId: z.string().min(1).nullish(),
    blockStart: z.coerce.date(),
    blockEnd: z.coerce.date(),
    reason: z.string().trim().min(1).max(255),
  })
  .refine((v) => v.blockEnd > v.blockStart, { message: "End must be after start.", path: ["blockEnd"] });

export const listBlockedDatesQuerySchema = z.object({
  // Not z.coerce.boolean() — that turns the query string "false" into true.
  includePast: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
