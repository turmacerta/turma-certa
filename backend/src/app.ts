import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { adminRouter } from "./modules/admin/admin.routes";
import { billingRouter } from "./modules/billing/billing.routes";
import { catalogRouter } from "./modules/catalog/catalog.routes";
import { classRouter } from "./modules/classes/class.routes";
import { healthRouter } from "./modules/health/health.routes";
import { meRouter } from "./modules/me/me.routes";
import { organizationRouter } from "./modules/organizations/organization.routes";
import { scheduleRouter } from "./modules/schedule/schedule.routes";
import { studentRouter } from "./modules/students/student.routes";
import { teacherRouter } from "./modules/teachers/teacher.routes";
import { teamRouter } from "./modules/team/team.routes";
import { portalRouter } from "./modules/portal/portal.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "3mb" }));

  app.use("/health", healthRouter);
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/me/students", portalRouter);
  app.use("/api/v1/me", meRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/organizations", organizationRouter);
  app.use("/api/v1/organizations/:orgId", catalogRouter);
  app.use("/api/v1/organizations/:orgId/students", studentRouter);
  app.use("/api/v1/organizations/:orgId/teachers", teacherRouter);
  app.use("/api/v1/organizations/:orgId/classes", classRouter);
  app.use("/api/v1/organizations/:orgId/schedule", scheduleRouter);
  app.use("/api/v1/organizations/:orgId/billing", billingRouter);
  app.use("/api/v1/organizations/:orgId/team", teamRouter);

  app.use(errorHandler);
  return app;
}
