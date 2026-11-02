import { Router } from "express";
import { can, ownTeacherId, requireAuth, requireOrgMember, requirePermission, scopedTeacher } from "../../middleware/auth";
import { Errors } from "../../shared/errors";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import {
  classGroupSchema,
  classGroupUpdateSchema,
  enrollmentSchema,
  mergeClassSchema,
  vacancyAlertSchema,
} from "./class.schema";
import { classService } from "./class.service";

export const classRouter = Router({ mergeParams: true });

classRouter.use(requireAuth, requireOrgMember);

const manage = requirePermission("classes.manage");

classRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await classService.list(req.params.orgId, await scopedTeacher(req, "classes.view_all")))),
);

classRouter.get(
  "/vacancies",
  requirePermission("classes.view_all"),
  asyncHandler(async (req, res) =>
    ok(res, await classService.listVacancies(req.params.orgId)),
  ),
);

classRouter.post(
  "/",
  requirePermission("classes.manage", "classes.create_own"),
  asyncHandler(async (req, res) => {
    const input = parseBody(classGroupSchema, req.body);
    if (can(req, "classes.manage")) {
      return created(res, await classService.create(req.params.orgId, input));
    }
    const teacherId = await ownTeacherId(req);
    if (!teacherId) {
      throw Errors.forbidden();
    }
    return created(res, await classService.create(req.params.orgId, { ...input, teacherId }));
  }),
);

classRouter.get(
  "/:classId",
  asyncHandler(async (req, res) =>
    ok(res, await classService.get(req.params.orgId, req.params.classId, can(req, "classes.view_all") ? null : await scopedTeacher(req, "classes.view_all"))),
  ),
);

classRouter.patch(
  "/:classId",
  manage,
  asyncHandler(async (req, res) => ok(res, await classService.update(req.params.orgId, req.params.classId, parseBody(classGroupUpdateSchema, req.body)))),
);

classRouter.delete(
  "/:classId",
  manage,
  asyncHandler(async (req, res) => ok(res, await classService.archive(req.params.orgId, req.params.classId))),
);

classRouter.delete(
  "/:classId/enrollments/:studentId",
  manage,
  asyncHandler(async (req, res) => ok(res, await classService.unenroll(req.params.orgId, req.params.classId, req.params.studentId))),
);

classRouter.post(
  "/:classId/enrollments",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(enrollmentSchema, req.body);
    return created(
      res,
      await classService.enroll(req.params.orgId, req.params.classId, input),
    );
  }),
);

classRouter.post(
  "/:classId/alerts",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(vacancyAlertSchema, req.body);
    return created(
      res,
      await classService.createAlert(req.params.orgId, req.params.classId, input),
    );
  }),
);

classRouter.post(
  "/:classId/notify",
  manage,
  asyncHandler(async (req, res) =>
    ok(res, await classService.notifyVacancies(req.params.orgId, req.params.classId)),
  ),
);

classRouter.post(
  "/:classId/merge",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(mergeClassSchema, req.body);
    return ok(res, await classService.merge(req.params.orgId, req.params.classId, input));
  }),
);
