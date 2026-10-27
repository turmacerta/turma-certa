import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { attendanceSchema, generateSessionsSchema } from "./schedule.schema";
import { scheduleService } from "./schedule.service";

export const scheduleRouter = Router({ mergeParams: true });

scheduleRouter.use(requireAuth, requireOrgStaff);

scheduleRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = String(req.query.from ?? new Date().toISOString());
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    const to = String(req.query.to ?? toDate.toISOString());
    return ok(res, await scheduleService.list(req.params.orgId, from, to));
  }),
);

scheduleRouter.post(
  "/generate",
  asyncHandler(async (req, res) => {
    const input = parseBody(generateSessionsSchema, req.body);
    return created(res, await scheduleService.generate(req.params.orgId, input));
  }),
);

scheduleRouter.post(
  "/sessions/:sessionId/attendance",
  asyncHandler(async (req, res) => {
    const input = parseBody(attendanceSchema, req.body);
    return created(
      res,
      await scheduleService.markAttendance(
        req.params.orgId,
        req.params.sessionId,
        input,
      ),
    );
  }),
);
