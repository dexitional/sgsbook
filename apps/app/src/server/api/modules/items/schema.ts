import { z } from "zod";

export const createItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  amount: z.number().nonnegative().optional(),
  intamount: z.number().nonnegative().optional(),
  extamount: z.number().nonnegative().optional(),
  itemType: z.enum(["FACILITY", "ADDON"]).default("FACILITY"),
});

export const updateItemSchema = createItemSchema.partial().extend({
  status: z.boolean().optional(),
});

export const listItemsQuerySchema = z.object({
  itemType: z.enum(["FACILITY", "ADDON"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
