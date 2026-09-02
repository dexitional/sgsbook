import { z } from "zod";

export const createUserSchema = z.object({
  tag: z.string().min(1),
  username: z.string().min(1),
  name: z.string().min(1).optional(),
  password: z.string().min(8),
  appRoleIds: z.array(z.coerce.number()).min(1, "Select at least one role"),
});

export const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  status: z.boolean().optional(),
  locked: z.boolean().optional(),
  appRoleIds: z.array(z.coerce.number()).optional(),
});

export const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const createRoleSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});
