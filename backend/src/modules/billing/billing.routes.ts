import { Router } from "express";
import { requireAuth, requireOrgStaff } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { billingPlanSchema, subscriptionSchema } from "./billing.schema";
import { billingService } from "./billing.service";

export const billingRouter = Router({ mergeParams: true });

billingRouter.use(requireAuth, requireOrgStaff);

billingRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await billingService.summary(req.params.orgId))),
);

billingRouter.get(
  "/plans",
  asyncHandler(async (req, res) =>
    ok(res, await billingService.listPlans(req.params.orgId)),
  ),
);

billingRouter.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const input = parseBody(billingPlanSchema, req.body);
    return created(res, await billingService.createPlan(req.params.orgId, input));
  }),
);

billingRouter.post(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const input = parseBody(subscriptionSchema, req.body);
    return created(res, await billingService.subscribe(req.params.orgId, input));
  }),
);

billingRouter.post(
  "/subscriptions/:subscriptionId/renew",
  asyncHandler(async (req, res) =>
    ok(res, await billingService.renew(req.params.orgId, req.params.subscriptionId)),
  ),
);
