import { z } from "zod";

export const classGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sportId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  classLevelId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  spaceId: z.string().uuid().optional(),
  format: z.enum(["group", "private"]).default("group"),
  maxCapacity: z.number().int().min(1).max(80).default(8),
  schedules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startsAt: z.string().regex(/^\d{2}:\d{2}$/),
        endsAt: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .default([]),
});

export const enrollmentSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(["active", "paused", "cancelled", "waitlist"]).default("active"),
});

export const vacancyAlertSchema = z.object({
  studentId: z.string().uuid(),
});
