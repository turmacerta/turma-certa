import { z } from "zod";

export const unitSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(180).optional(),
});

export const spaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const sportSchema = z.object({
  name: z.string().trim().min(2).max(60),
});

export const levelSchema = z.object({
  name: z.string().trim().min(2).max(60),
  rank: z.number().int().min(0).max(20).default(0),
  sportId: z.string().uuid().optional(),
});
