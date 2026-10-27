import { z } from "zod";

export const updateSaasPlanSchema = z.object({
  saasPlan: z.enum(["autonomous", "school"]),
});
