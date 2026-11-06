import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  saasPlan: z.enum(["autonomous", "school"]).default("autonomous"),
  document: z.string().trim().min(11).max(18).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  email: z.string().email().optional(),
});

export const lessonRulesSchema = z.object({
  noticeHours: z.number().int().min(0).max(72),
  creditDays: z.number().int().min(7).max(120),
  maxCredits: z.number().int().min(1).max(20),
  sameLevel: z.boolean(),
  anyUnit: z.boolean(),
  rainCredit: z.boolean(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().extend({
  lessonRules: lessonRulesSchema.optional(),
  logoSport: z.enum(["tennis", "soccer", "basketball", "volleyball", "racket", "boxing", "belt", "dumbbell", "target", "trophy", "star"]).optional(),
});
