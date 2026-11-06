import { Router, type Request, type Response, type NextFunction } from "express";
import { env } from "../../config/env";
import { Errors } from "../../shared/errors";
import { asyncHandler, ok } from "../../shared/http";
import { runScheduleHorizonJob } from "../../jobs/schedule-horizon";

export const internalRouter = Router();

function requireCronSecret(req: Request, _res: Response, next: NextFunction) {
  const secret = env.cronSecret;
  if (!secret) {
    throw Errors.forbidden();
  }
  const header = req.header("x-cron-secret") ?? "";
  if (header !== secret) {
    throw Errors.unauthenticated();
  }
  next();
}

internalRouter.post(
  "/cron/schedule",
  requireCronSecret,
  asyncHandler(async (_req, res) => ok(res, await runScheduleHorizonJob("http"))),
);
