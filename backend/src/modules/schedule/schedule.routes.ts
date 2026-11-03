import { Router } from "express";
import { can, requireAuth, requireOrgMember, requirePermission, scopedTeacher } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { cancelSessionSchema, generateSessionsSchema } from "./schedule.schema";
import { scheduleService } from "./schedule.service";

export const scheduleRouter = Router({ mergeParams: true });

scheduleRouter.use(requireAuth, requireOrgMember);

scheduleRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = String(req.query.from ?? new Date().toISOString());
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    const to = String(req.query.to ?? toDate.toISOString());
    return ok(res, await scheduleService.list(req.params.orgId, from, to, await scopedTeacher(req, "schedule.view_all")));
  }),
);

scheduleRouter.post(
  "/generate",
  requirePermission("classes.manage"),
  asyncHandler(async (req, res) => {
    const input = parseBody(generateSessionsSchema, req.body);
    return created(res, await scheduleService.generate(req.params.orgId, input));
  }),
);

scheduleRouter.post(
  "/sessions/:sessionId/cancel",
  requirePermission("schedule.manage", "schedule.cancel_own"),
  asyncHandler(async (req, res) => {
    const input = parseBody(cancelSessionSchema, req.body ?? {});
    const teacherId = can(req, "schedule.manage") ? null : await scopedTeacher(req, "schedule.manage");
    return ok(res, await scheduleService.setCancelled(req.params.orgId, req.params.sessionId, true, input, teacherId));
  }),
);

scheduleRouter.post(
  "/sessions/:sessionId/restore",
  requirePermission("schedule.manage", "schedule.cancel_own"),
  asyncHandler(async (req, res) => {
    const teacherId = can(req, "schedule.manage") ? null : await scopedTeacher(req, "schedule.manage");
    return ok(res, await scheduleService.setCancelled(req.params.orgId, req.params.sessionId, false, {}, teacherId));
  }),
);

scheduleRouter.get(
  "/sessions/:sessionId/attendance",
  requirePermission("attendance.take", "schedule.view_all"),
  asyncHandler(async (req, res) => ok(res, await scheduleService.attendance(req.params.orgId, req.params.sessionId))),
);
