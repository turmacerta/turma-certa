import { Router } from "express";
import { requireAuth, requireOrgMember, requirePermission } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import { billingPlanSchema, billingPlanUpdateSchema, reminderSchema, subscriptionSchema } from "./billing.schema";
import { notificationService } from "../notifications/notification.service";
import { billingService } from "./billing.service";

export const billingRouter = Router({ mergeParams: true });

billingRouter.use(requireAuth, requireOrgMember);
billingRouter.use((req, res, next) =>
  req.method === "GET" ? requirePermission("billing.view", "billing.manage")(req, res, next) : requirePermission("billing.manage")(req, res, next),
);

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

billingRouter.patch(
  "/plans/:planId",
  asyncHandler(async (req, res) => ok(res, await billingService.updatePlan(req.params.orgId, req.params.planId, parseBody(billingPlanUpdateSchema, req.body)))),
);

billingRouter.post(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const input = parseBody(subscriptionSchema, req.body);
    return created(res, await billingService.subscribe(req.params.orgId, input));
  }),
);

billingRouter.post(
  "/invoices/:invoiceId/pay",
  asyncHandler(async (req, res) => ok(res, await billingService.markPaid(req.params.orgId, req.params.invoiceId))),
);

billingRouter.post(
  "/reminders",
  asyncHandler(async (req, res) => {
    const input = parseBody(reminderSchema, req.body ?? {});
    return ok(res, await notificationService.remindOverdue(req.params.orgId, input.studentIds));
  }),
);

billingRouter.post(
  "/subscriptions/:subscriptionId/renew",
  asyncHandler(async (req, res) =>
    ok(res, await billingService.renew(req.params.orgId, req.params.subscriptionId)),
  ),
);
