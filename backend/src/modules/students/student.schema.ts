import { z } from "zod";

export const studentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  birthDate: z.string().date().optional(),
  document: z.string().trim().min(5).max(20).optional(),
  emergencyContactName: z.string().trim().max(120).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
  classLevelId: z.string().uuid().optional(),
});

export const creditSchema = z.object({
  quantity: z.number().int().refine((value) => value !== 0),
  kind: z.enum(["regular", "makeup"]).default("regular"),
  reason: z.string().trim().max(180).optional(),
  expiresAt: z.string().date().optional(),
});
