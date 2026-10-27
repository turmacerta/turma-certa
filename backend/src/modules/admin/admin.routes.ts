import { Router } from "express";
import { requireAuth, requirePlatformAdmin } from "../../middleware/auth";
import { asyncHandler, ok, parseBody } from "../../shared/http";
import { updateSaasPlanSchema } from "./admin.schema";
import { adminService } from "./admin.service";

export const adminRouter = Router();

adminRouter.use(requireAuth, requirePlatformAdmin);

adminRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => ok(res, await adminService.summary())),
);

adminRouter.get(
  "/organizations/:orgId",
  asyncHandler(async (req, res) =>
    ok(res, await adminService.getOrganization(req.params.orgId)),
  ),
);

adminRouter.patch(
  "/organizations/:orgId",
  asyncHandler(async (req, res) => {
    const input = parseBody(updateSaasPlanSchema, req.body);
    return ok(res, await adminService.updatePlan(req.params.orgId, input));
  }),
);
