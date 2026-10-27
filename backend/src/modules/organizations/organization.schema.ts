import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  saasPlan: z.enum(["autonomous", "school"]).default("autonomous"),
  document: z.string().trim().min(11).max(18).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  email: z.string().email().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();
