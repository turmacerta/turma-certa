import { assertFitsPlan } from "../../shared/plans";
import { monthlyEstimate } from "../../shared/pricing";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type { updateSaasPlanSchema } from "./admin.schema";

type OverviewRow = {
  id: string;
  name: string;
  slug: string;
  saas_plan: "autonomous" | "school";
  organization_email: string | null;
  created_at: string;
  student_count: number;
  teacher_count: number;
  class_count: number;
  unit_count: number;
};

type OwnerRow = {
  organization_id: string;
  profile: { full_name: string; email: string | null } | null;
};

function asOwner(profile: unknown): OwnerRow["profile"] {
  const value = Array.isArray(profile) ? profile[0] : profile;
  if (!value || typeof value !== "object") {
    return null;
  }
  const row = value as { full_name?: string; email?: string | null };
  return {
    full_name: row.full_name ?? "",
    email: row.email ?? null,
  };
}

function withOwners(orgs: OverviewRow[], owners: OwnerRow[]) {
  const ownerByOrg = new Map(
    owners.map((row) => [
      row.organization_id,
      {
        fullName: row.profile?.full_name || null,
        email: row.profile?.email ?? null,
      },
    ]),
  );

  return orgs.map((org) => ({
    ...org,
    owner: ownerByOrg.get(org.id) ?? { fullName: null, email: null },
  }));
}

export class AdminService {
  async summary() {
    const base = withOwners(await this.listOrganizations(), await this.listOwners());
    const organizations = await Promise.all(
      base.map(async (org) => {
        const estimate = await monthlyEstimate(org.id);
        return { ...org, monthly_cents: estimate.total_cents, tag_counts: Object.fromEntries(estimate.lines.map((line) => [line.tag, line.count])) };
      }),
    );
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      schoolCount: organizations.length,
      autonomousCount: organizations.filter((item) => item.saas_plan === "autonomous").length,
      schoolPlanCount: organizations.filter((item) => item.saas_plan === "school").length,
      newLast7Days: organizations.filter(
        (item) => new Date(item.created_at).getTime() >= sevenDaysAgo,
      ).length,
      studentCount: organizations.reduce((sum, item) => sum + item.student_count, 0),
      organizations,
    };
  }

  async getOrganization(orgId: string) {
    const org = unwrap(
      await getAdminClient()
        .from("platform_organization_overview")
        .select("*")
        .eq("id", orgId)
        .maybeSingle(),
    ) as OverviewRow | null;

    if (!org) {
      throw Errors.notFound("Organization");
    }

    const owners = (
      unwrap(
        await getAdminClient()
          .from("organization_members")
          .select("organization_id, role, profile:profiles(full_name, email)")
          .eq("organization_id", orgId)
          .eq("role", "owner"),
      ) ?? []
    ).map((row) => ({
      organization_id: row.organization_id as string,
      profile: asOwner(row.profile),
    }));

    const [detail] = withOwners([org], owners);
    if (!detail) {
      throw Errors.notFound("Organization");
    }
    return detail;
  }

  async updatePlan(orgId: string, input: z.infer<typeof updateSaasPlanSchema>) {
    if (input.saasPlan === "autonomous") {
      await assertFitsPlan(orgId, "autonomous");
    }

    const organization = unwrap(
      await getAdminClient()
        .from("organizations")
        .update({ saas_plan: input.saasPlan })
        .eq("id", orgId)
        .select("id, name, saas_plan")
        .maybeSingle(),
    );

    if (!organization) {
      throw Errors.notFound("Organization");
    }

    return organization;
  }

  private async listOrganizations() {
    return (unwrap(
      await getAdminClient()
        .from("platform_organization_overview")
        .select("*")
        .order("created_at", { ascending: false }),
    ) ?? []) as OverviewRow[];
  }

  private async listOwners() {
    return (
      unwrap(
        await getAdminClient()
          .from("organization_members")
          .select("organization_id, profile:profiles(full_name, email)")
          .eq("role", "owner"),
      ) ?? []
    ).map((row) => ({
      organization_id: row.organization_id as string,
      profile: asOwner(row.profile),
    }));
  }
}

export const adminService = new AdminService();
