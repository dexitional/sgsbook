import { z } from "zod";

export const contactPersonSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  designation: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  location: z.string().optional(),
  organisation: z.string().optional(),
  imageUrl: z.string().url().optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]).default("INTERNAL"),
  contacts: z.array(contactPersonSchema).optional(),
});

export const updateClientSchema = createClientSchema.partial().omit({ contacts: true });

export const listClientsQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
