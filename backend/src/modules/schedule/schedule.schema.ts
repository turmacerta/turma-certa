import { z } from "zod";

export const cancelSessionSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
