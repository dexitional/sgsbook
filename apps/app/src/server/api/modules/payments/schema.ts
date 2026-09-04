import { z } from "zod";

export const recordPaymentSchema = z.object({
  requestId: z.string().min(1),
  description: z.string().optional(),
  paidName: z.string().optional(),
  paidRef: z.string().optional(),
  paidAmount: z.number().positive(),
  paidAt: z.coerce.date().optional(),
});

export const listPaymentsQuerySchema = z.object({
  requestId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
