import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
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
  requireOrgStaff,
  asyncHandler(async (req, res) => {
    return ok(res, await organizationService.getById(req.params.orgId));
  }),
);

organizationRouter.patch(
  "/:orgId",
  requireAuth,
  requireOrgStaff,
  asyncHandler(async (req, res) => {
    const input = parseBody(updateOrganizationSchema, req.body);
    return ok(res, await organizationService.update(req.params.orgId, input));
  }),
);
