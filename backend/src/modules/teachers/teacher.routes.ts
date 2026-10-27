import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { teacherSchema } from "./teacher.schema";
import { teacherService } from "./teacher.service";

export const teacherRouter = Router({ mergeParams: true });

teacherRouter.use(requireAuth, requireOrgStaff);

teacherRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await teacherService.list(req.params.orgId))),
);

teacherRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseBody(teacherSchema, req.body);
    return created(res, await teacherService.create(req.params.orgId, input));
  }),
);

teacherRouter.get(
  "/:teacherId",
  asyncHandler(async (req, res) =>
    ok(res, await teacherService.get(req.params.orgId, req.params.teacherId)),
  ),
);
