import { Router } from "express";
import { requireAuth, requireOrgMember, requirePermission, scopedTeacher } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { photoSchema } from "../../shared/photo.schema";
import { uploadPhoto } from "../../shared/photos";
import { creditSchema, studentSchema } from "./student.schema";
import { studentService } from "./student.service";
import { teamService } from "../team/team.service";

export const studentRouter = Router({ mergeParams: true });

studentRouter.use(requireAuth, requireOrgMember);

const manage = requirePermission("students.manage");
const viewStudents = asyncHandler(async (req, _res, next) => {
  await scopedTeacher(req, "students.view_all");
  next();
});

studentRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await studentService.list(req.params.orgId, await scopedTeacher(req, "students.view_all")))),
);

studentRouter.post(
  "/",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(studentSchema, req.body);
    const student = await studentService.create(req.params.orgId, input);
    const access = await teamService.grantStudentAccess(req.params.orgId, student.id as string).then(
      (result) => (result.invited ? "invited" : "linked"),
      () => "failed",
    );
    return created(res, { ...student, access });
  }),
);

studentRouter.get(
  "/:studentId",
  viewStudents,
  asyncHandler(async (req, res) =>
    ok(res, await studentService.get(req.params.orgId, req.params.studentId)),
  ),
);

studentRouter.patch(
  "/:studentId",
  manage,
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
  viewStudents,
  asyncHandler(async (req, res) =>
    ok(res, await studentService.listCredits(req.params.orgId, req.params.studentId)),
  ),
);

studentRouter.post(
  "/:studentId/access",
  manage,
  asyncHandler(async (req, res) => ok(res, await teamService.grantStudentAccess(req.params.orgId, req.params.studentId))),
);

studentRouter.put(
  "/:studentId/photo",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(photoSchema, req.body);
    const url = await uploadPhoto(`students/${req.params.orgId}`, req.params.studentId, input.dataUrl);
    return ok(res, await studentService.setPhoto(req.params.orgId, req.params.studentId, url));
  }),
);

studentRouter.post(
  "/:studentId/credits",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(creditSchema, req.body);
    return created(
      res,
      await studentService.addCredit(req.params.orgId, req.params.studentId, input),
    );
  }),
);
