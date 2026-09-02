import { z } from "zod";

export const loginSchema = z.object({
  tag: z.string().min(1),
  password: z.string().min(1),
});
