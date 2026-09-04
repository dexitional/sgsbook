import { z } from "zod";

export const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.enum(["facilities", "clients"]),
});
