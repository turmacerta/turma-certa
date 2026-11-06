import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth, requireOrgMember, requirePermission } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { TAGS, type MemberTag } from "../../shared/permissions";
import { teamService } from "./team.service";

export const teamRouter = Router({ mergeParams: true });

teamRouter.use(requireAuth, requireOrgMember, requirePermission("team.manage"));

const roleSchema = z.object({
  name: z.string().trim().min(2).max(40),
  tag: z.enum(TAGS as [MemberTag, ...MemberTag[]]),
  permissions: z.array(z.string()).default([]),
});
const roleUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40).optional(),
  tag: z.enum(TAGS as [MemberTag, ...MemberTag[]]).optional(),
  permissions: z.array(z.string()).optional(),
});
const memberSchema = z.object({ email: z.string().trim().email(), roleId: z.string().uuid() });
const memberRoleSchema = z.object({ roleId: z.string().uuid() });

const granted = (req: Request) => req.permissions ?? new Set<string>();

teamRouter.get(
  "/roles",
  asyncHandler(async (req, res) => ok(res, await teamService.listRoles(req.params.orgId))),
);

teamRouter.post(
  "/roles",
  asyncHandler(async (req, res) => created(res, await teamService.createRole(req.params.orgId, granted(req), parseBody(roleSchema, req.body)))),
);

teamRouter.patch(
  "/roles/:roleId",
  asyncHandler(async (req, res) =>
    ok(res, await teamService.updateRole(req.params.orgId, granted(req), req.params.roleId, parseBody(roleUpdateSchema, req.body))),
  ),
);

teamRouter.delete(
  "/roles/:roleId",
  asyncHandler(async (req, res) => ok(res, await teamService.deleteRole(req.params.orgId, req.params.roleId))),
);

teamRouter.get(
  "/members",
  asyncHandler(async (req, res) => ok(res, await teamService.listMembers(req.params.orgId))),
);

teamRouter.post(
  "/members",
  asyncHandler(async (req, res) => {
    const input = parseBody(memberSchema, req.body);
    return created(res, await teamService.addMember(req.params.orgId, granted(req), input.email, input.roleId));
  }),
);

teamRouter.patch(
  "/members/:memberId",
  asyncHandler(async (req, res) => {
    const input = parseBody(memberRoleSchema, req.body);
    return ok(res, await teamService.setRole(req.params.orgId, granted(req), req.params.memberId, input.roleId));
  }),
);

teamRouter.post(
  "/members/:memberId/resend",
  asyncHandler(async (req, res) => ok(res, await teamService.resendInvite(req.params.orgId, req.params.memberId))),
);

teamRouter.delete(
  "/members/:memberId",
  asyncHandler(async (req, res) => ok(res, await teamService.removeMember(req.params.orgId, req.params.memberId))),
);
