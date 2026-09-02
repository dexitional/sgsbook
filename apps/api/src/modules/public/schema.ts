import { z } from "zod";

export const calendarQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});
