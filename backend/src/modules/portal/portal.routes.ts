import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler, ok, parseBody } from "../../shared/http";
import { portalService } from "./portal.service";

export const portalRouter = Router();

portalRouter.use(requireAuth);

portalRouter.get(
  "/",
  asyncHandler(async (req, res) => ok(res, await portalService.linkedStudents(req.user?.id ?? ""))),
);

portalRouter.get(
  "/staff/:orgId",
  asyncHandler(async (req, res) => ok(res, await portalService.studentsForStaff(req, req.params.orgId))),
);

portalRouter.get(
  "/:studentId",
  asyncHandler(async (req, res) => ok(res, await portalService.overview(req, req.params.studentId))),
);

portalRouter.post(
  "/:studentId/lessons/:sessionId/cancel",
  asyncHandler(async (req, res) => ok(res, await portalService.cancel(req, req.params.studentId, req.params.sessionId))),
);

portalRouter.post(
  "/:studentId/lessons/:sessionId/restore",
  asyncHandler(async (req, res) => ok(res, await portalService.restore(req, req.params.studentId, req.params.sessionId))),
);

portalRouter.post(
  "/:studentId/makeup/:sessionId",
  asyncHandler(async (req, res) => ok(res, await portalService.book(req, req.params.studentId, req.params.sessionId))),
);

portalRouter.delete(
  "/:studentId/makeup/:sessionId",
  asyncHandler(async (req, res) => ok(res, await portalService.unbook(req, req.params.studentId, req.params.sessionId))),
);

portalRouter.put(
  "/:studentId/alert",
  asyncHandler(async (req, res) => {
    const input = parseBody(z.object({ on: z.boolean() }), req.body);
    return ok(res, await portalService.setAlert(req, req.params.studentId, input.on));
  }),
);

portalRouter.post(
  "/:studentId/renewal",
  asyncHandler(async (req, res) => ok(res, await portalService.requestRenewal(req, req.params.studentId))),
);
