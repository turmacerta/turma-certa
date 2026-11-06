import { Router } from "express";
import { requireAuth, requireOrgMember, requirePermission } from "../../middleware/auth";
import { asyncHandler, created, ok, parseBody } from "../../shared/http";
import {
  levelSchema,
  spaceSchema,
  sportSchema,
  unitSchema,
} from "./catalog.schema";
import { catalogService } from "./catalog.service";

export const catalogRouter = Router({ mergeParams: true });

const read = [requireAuth, requireOrgMember];
const write = [requireAuth, requireOrgMember, requirePermission("settings.manage")];

catalogRouter.get(
  "/units",
  ...read,
  asyncHandler(async (req, res) => ok(res, await catalogService.listUnits(req.params.orgId))),
);

catalogRouter.post(
  "/units",
  ...write,
  asyncHandler(async (req, res) => {
    const input = parseBody(unitSchema, req.body);
    return created(res, await catalogService.createUnit(req.params.orgId, input));
  }),
);

catalogRouter.post(
  "/units/:unitId/spaces",
  ...write,
  asyncHandler(async (req, res) => {
    const input = parseBody(spaceSchema, req.body);
    return created(
      res,
      await catalogService.createSpace(req.params.orgId, req.params.unitId, input),
    );
  }),
);

catalogRouter.get(
  "/sports",
  ...read,
  asyncHandler(async (req, res) => ok(res, await catalogService.listSports(req.params.orgId))),
);

catalogRouter.post(
  "/sports",
  ...write,
  asyncHandler(async (req, res) => {
    const input = parseBody(sportSchema, req.body);
    return created(res, await catalogService.createSport(req.params.orgId, input));
  }),
);

catalogRouter.get(
  "/levels",
  ...read,
  asyncHandler(async (req, res) => ok(res, await catalogService.listLevels(req.params.orgId))),
);

catalogRouter.post(
  "/levels",
  ...write,
  asyncHandler(async (req, res) => {
    const input = parseBody(levelSchema, req.body);
    return created(res, await catalogService.createLevel(req.params.orgId, input));
  }),
);

catalogRouter.patch(
  "/units/:unitId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.updateUnit(req.params.orgId, req.params.unitId, parseBody(unitSchema.partial(), req.body)))),
);

catalogRouter.delete(
  "/units/:unitId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.deleteUnit(req.params.orgId, req.params.unitId))),
);

catalogRouter.patch(
  "/spaces/:spaceId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.updateSpace(req.params.orgId, req.params.spaceId, parseBody(spaceSchema, req.body)))),
);

catalogRouter.delete(
  "/spaces/:spaceId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.deleteSpace(req.params.orgId, req.params.spaceId))),
);

catalogRouter.patch(
  "/sports/:sportId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.updateSport(req.params.orgId, req.params.sportId, parseBody(sportSchema, req.body)))),
);

catalogRouter.delete(
  "/sports/:sportId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.deleteSport(req.params.orgId, req.params.sportId))),
);

catalogRouter.patch(
  "/levels/:levelId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.updateLevel(req.params.orgId, req.params.levelId, parseBody(levelSchema.partial(), req.body)))),
);

catalogRouter.delete(
  "/levels/:levelId",
  ...write,
  asyncHandler(async (req, res) => ok(res, await catalogService.deleteLevel(req.params.orgId, req.params.levelId))),
);
