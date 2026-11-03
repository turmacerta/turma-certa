import { Router } from "express";
import { z } from "zod";
import { Errors } from "../../shared/errors";
import { asyncHandler, created, parseBody } from "../../shared/http";
import { leadService } from "./lead.service";

export const leadRouter = Router();

const leadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(10).max(20),
  school: z.string().trim().min(2).max(120),
  mode: z.enum(["school", "autonomous"]),
  students: z.number().int().min(0).max(100000).optional(),
  managers: z.number().int().min(0).max(1000).optional(),
  teachers: z.number().int().min(0).max(1000).optional(),
  message: z.string().trim().max(2000).optional(),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function allow(ip: string) {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length <= MAX_PER_WINDOW;
}

leadRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    if (!allow(req.ip ?? "unknown")) {
      throw Errors.conflict("Too many requests. Try again in a few minutes.", "RATE_LIMITED");
    }
    return created(res, await leadService.create(parseBody(leadSchema, req.body)));
  }),
);
