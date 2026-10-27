import { z } from "zod";

export const teacherSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  bio: z.string().trim().max(2000).optional(),
  sportIds: z.array(z.string().uuid()).default([]),
});
