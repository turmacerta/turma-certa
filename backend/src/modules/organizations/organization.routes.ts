import { Router } from "express";
import { monthlyEstimate } from "../../shared/pricing";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { requireAuth, requireOrgMember, requirePermission } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "./organization.schema";
import { organizationService } from "./organization.service";
import { Errors } from "../../shared/errors";

export const organizationRouter = Router();

organizationRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw Errors.unauthenticated();
    }
    return ok(res, await organizationService.listForUser(userId));
  }),
);

organizationRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw Errors.unauthenticated();
    }
    const input = parseBody(createOrganizationSchema, req.body);
    return created(res, await organizationService.create(userId, input));
  }),
);

organizationRouter.get(
  "/:orgId",
  requireAuth,
  requireOrgMember,
  asyncHandler(async (req, res) => {
    return ok(res, await organizationService.getById(req.params.orgId));
  }),
);

organizationRouter.get(
  "/:orgId/pricing",
  requireAuth,
  requireOrgMember,
  requirePermission("settings.manage", "team.manage"),
  asyncHandler(async (req, res) => ok(res, await monthlyEstimate(req.params.orgId))),
);

organizationRouter.get(
  "/:orgId/notifications",
  requireAuth,
  requireOrgMember,
  requirePermission("students.view_all", "schedule.view_all"),
  asyncHandler(async (req, res) =>
    ok(
      res,
      unwrap(
        await getAdminClient()
          .from("notifications")
          .select("id, kind, title, body, recipient_name, created_at")
          .eq("organization_id", req.params.orgId)
          .order("created_at", { ascending: false })
          .limit(20),
      ),
    ),
  ),
);

organizationRouter.patch(
  "/:orgId",
  requireAuth,
  requireOrgMember,
  requirePermission("settings.manage"),
  asyncHandler(async (req, res) => {
    const input = parseBody(updateOrganizationSchema, req.body);
    return ok(res, await organizationService.update(req.params.orgId, input));
  }),
);
