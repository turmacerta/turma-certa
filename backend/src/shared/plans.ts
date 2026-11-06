import { getAdminClient, unwrap } from "../infrastructure/supabase/client";
import { Errors } from "./errors";

export type SaasPlan = "autonomous" | "school";
export type PlanResource = "students" | "teachers" | "units";

export const PLAN_LIMITS: Record<SaasPlan, Record<PlanResource, number | null>> = {
  autonomous: { students: null, teachers: 1, units: 1 },
  school: { students: null, teachers: null, units: null },
};

const RESOURCES: PlanResource[] = ["students", "teachers", "units"];

export async function planOf(orgId: string) {
  const organization = unwrap(
    await getAdminClient().from("organizations").select("saas_plan").eq("id", orgId).maybeSingle(),
  );

  if (!organization) {
    throw Errors.notFound("Organization");
  }

  return organization.saas_plan as SaasPlan;
}

async function countOf(orgId: string, resource: PlanResource) {
  const { count, error } = await getAdminClient()
    .from(resource)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if (error) {
    throw Errors.database(error.message);
  }

  return count ?? 0;
}

export async function assertPlanCapacity(orgId: string, resource: PlanResource) {
  const limit = PLAN_LIMITS[await planOf(orgId)][resource];
  if (limit !== null && (await countOf(orgId, resource)) >= limit) {
    throw Errors.planLimit(resource, limit);
  }
}

export async function assertFitsPlan(orgId: string, plan: SaasPlan) {
  for (const resource of RESOURCES) {
    const limit = PLAN_LIMITS[plan][resource];
    if (limit !== null && (await countOf(orgId, resource)) > limit) {
      throw Errors.planLimit(resource, limit);
    }
  }
}
