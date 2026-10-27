import { z } from "zod";

export const generateSessionsSchema = z.object({
  classGroupId: z.string().uuid(),
  weeks: z.number().int().min(1).max(12).default(4),
});

export const attendanceSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["present", "absent", "makeup", "cancelled"]),
  makeupSessionId: z.string().uuid().optional(),
});
