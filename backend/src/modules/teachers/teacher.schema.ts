import { z } from "zod";

export const teacherSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().min(10).max(20),
  bio: z.string().trim().max(2000).optional(),
  sportIds: z.array(z.string().uuid()).default([]),
});

export const teacherSportsSchema = z.object({
  sportIds: z.array(z.string().uuid()),
});
