import { z } from "zod";

export const askInsightsSchema = z.object({
  question: z.string().min(1).max(500),
  // Recent turns from the *current* session, sent by the client so the model
  // has conversational context for follow-ups — not fetched from history on
  // the server, to keep this endpoint stateless per request.
  history: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .max(6)
    .optional(),
});
