import { z } from "zod";

export const billingPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  format: z.enum(["group", "private"]),
  lessonsPerCycle: z.number().int().min(1).max(40).optional(),
  cycleDays: z.number().int().min(7).max(365).default(30),
  priceCents: z.number().int().min(0),
});

export const billingPlanUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  lessonsPerCycle: z.number().int().min(1).max(40).nullable().optional(),
  cycleDays: z.number().int().min(7).max(365).optional(),
  priceCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const reminderSchema = z.object({
  studentIds: z.array(z.string().uuid()).optional(),
});

export const subscriptionSchema = z.object({
  studentId: z.string().uuid(),
  billingPlanId: z.string().uuid(),
  autoRenew: z.boolean().default(true),
});
