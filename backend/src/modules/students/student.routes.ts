import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { creditSchema, studentSchema } from "./student.schema";
import { studentService } from "./student.service";

export const studentRouter = Router({ mergeParams: true });

studentRouter.use(requireAuth, requireOrgStaff);

studentRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await studentService.list(req.params.orgId))),
);

studentRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = parseBody(studentSchema, req.body);
    return created(res, await studentService.create(req.params.orgId, input));
  }),
);

studentRouter.get(
  "/:studentId",
  asyncHandler(async (req, res) =>
    ok(res, await studentService.get(req.params.orgId, req.params.studentId)),
  ),
);

studentRouter.patch(
  "/:studentId",
  asyncHandler(async (req, res) => {
    const input = parseBody(studentSchema, req.body);
    return ok(
      res,
      await studentService.update(req.params.orgId, req.params.studentId, input),
    );
  }),
);

studentRouter.get(
  "/:studentId/credits",
  asyncHandler(async (req, res) =>
    ok(res, await studentService.listCredits(req.params.orgId, req.params.studentId)),
  ),
);

studentRouter.post(
  "/:studentId/credits",
  asyncHandler(async (req, res) => {
    const input = parseBody(creditSchema, req.body);
    return created(
      res,
      await studentService.addCredit(req.params.orgId, req.params.studentId, input),
    );
  }),
);
