import { Router } from "express";
import { requireAuth, requireOrgMember, requirePermission } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { photoSchema } from "../../shared/photo.schema";
import { uploadPhoto } from "../../shared/photos";
import { teacherSchema, teacherSportsSchema } from "./teacher.schema";
import { teacherService } from "./teacher.service";
import { teamService } from "../team/team.service";

export const teacherRouter = Router({ mergeParams: true });

teacherRouter.use(requireAuth, requireOrgMember);

const view = requirePermission("teachers.view", "teachers.manage", "classes.manage");
const manage = requirePermission("teachers.manage");

teacherRouter.get(
  "/",
  view,
  asyncHandler(async (req, res) => ok(res, await teacherService.list(req.params.orgId))),
);

teacherRouter.post(
  "/",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(teacherSchema, req.body);
    const teacher = await teacherService.create(req.params.orgId, input);
    const access = await teamService.grantTeacherAccess(req.params.orgId, teacher.id as string).then(
      (result) => (result.invited ? "invited" : "linked"),
      () => "failed",
    );
    return created(res, { ...teacher, access });
  }),
);

teacherRouter.get(
  "/:teacherId",
  view,
  asyncHandler(async (req, res) =>
    ok(res, await teacherService.get(req.params.orgId, req.params.teacherId)),
  ),
);

teacherRouter.put(
  "/:teacherId/sports",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(teacherSportsSchema, req.body);
    return ok(res, await teacherService.setSports(req.params.orgId, req.params.teacherId, input));
  }),
);

teacherRouter.put(
  "/:teacherId/photo",
  manage,
  asyncHandler(async (req, res) => {
    const input = parseBody(photoSchema, req.body);
    const url = await uploadPhoto(`teachers/${req.params.orgId}`, req.params.teacherId, input.dataUrl);
    const teacher = unwrap(
      await getAdminClient().from("teachers").update({ photo_url: url }).eq("organization_id", req.params.orgId).eq("id", req.params.teacherId).select("id, photo_url").maybeSingle(),
    );
    if (!teacher) {
      throw Errors.notFound("Teacher");
    }
    return ok(res, teacher);
  }),
);

teacherRouter.post(
  "/:teacherId/access",
  manage,
  asyncHandler(async (req, res) => ok(res, await teamService.grantTeacherAccess(req.params.orgId, req.params.teacherId))),
);

teacherRouter.patch(
  "/:teacherId",
  requirePermission("teachers.manage"),
  asyncHandler(async (req, res) => ok(res, await teacherService.update(req.params.orgId, req.params.teacherId, parseBody(teacherSchema.omit({ sportIds: true }).partial(), req.body)))),
);

teacherRouter.delete(
  "/:teacherId",
  requirePermission("teachers.manage"),
  asyncHandler(async (req, res) => ok(res, await teacherService.remove(req.params.orgId, req.params.teacherId))),
);
