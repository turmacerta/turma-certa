import { z } from "zod";

export const generateSessionsSchema = z.object({
  classGroupId: z.string().uuid(),
  weeks: z.number().int().min(1).max(12).default(4),
});

export const cancelSessionSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});

