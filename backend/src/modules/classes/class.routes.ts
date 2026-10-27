import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import {
  classGroupSchema,
  enrollmentSchema,
  vacancyAlertSchema,
} from "./class.schema";
import { classService } from "./class.service";

export const classRouter = Router({ mergeParams: true });

classRouter.use(requireAuth, requireOrgStaff);

classRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await classService.list(req.params.orgId))),
);

classRouter.get(
  "/vacancies",
  asyncHandler(async (req, res) =>
    ok(res, await classService.listVacancies(req.params.orgId)),
  ),
);

classRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseBody(classGroupSchema, req.body);
    return created(res, await classService.create(req.params.orgId, input));
  }),
);

classRouter.get(
  "/:classId",
  asyncHandler(async (req, res) =>
    ok(res, await classService.get(req.params.orgId, req.params.classId)),
  ),
);

classRouter.post(
  "/:classId/enrollments",
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
  asyncHandler(async (req, res) =>
    ok(res, await classService.notifyVacancies(req.params.orgId, req.params.classId)),
  ),
);
