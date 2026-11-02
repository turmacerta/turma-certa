import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { assertFitsPlan } from "../../shared/plans";
import { slugify } from "../../shared/slug";
import type { z } from "zod";
import type {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "./organization.schema";

type CreateInput = z.infer<typeof createOrganizationSchema>;
type UpdateInput = z.infer<typeof updateOrganizationSchema>;

export class OrganizationService {
  async listForUser(userId: string) {
    return unwrap(
      await getAdminClient()
        .from("organization_members")
        .select("role, organization:organizations(*)")
        .eq("profile_id", userId),
    );
  }

  async getById(orgId: string) {
    const organization = unwrap(
      await getAdminClient()
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .maybeSingle(),
    );

    if (!organization) {
      throw Errors.notFound("Organization");
    }

    return organization;
  }

  async create(userId: string, input: CreateInput) {
    const organization = unwrap(
      await getAdminClient()
        .from("organizations")
        .insert({
          name: input.name,
          slug: slugify(input.name),
          saas_plan: input.saasPlan,
          document: input.document ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
        })
        .select("*")
        .single(),
    );

    unwrap(
      await getAdminClient().from("organization_members").insert({
        organization_id: organization.id,
        profile_id: userId,
        role: "owner",
      }),
    );

    if (input.saasPlan === "autonomous") {
      const profile = unwrap(
        await getAdminClient().from("profiles").select("full_name, email, phone").eq("id", userId).maybeSingle(),
      );
      unwrap(
        await getAdminClient().from("teachers").insert({
          organization_id: organization.id,
          profile_id: userId,
          full_name: profile?.full_name ?? input.name,
          email: profile?.email ?? null,
          phone: profile?.phone ?? null,
        }),
      );
    }

    return organization;
  }

  async update(orgId: string, input: UpdateInput) {
    if (input.saasPlan === "autonomous") {
      await assertFitsPlan(orgId, "autonomous");
    }

    const organization = unwrap(
      await getAdminClient()
        .from("organizations")
        .update({
          name: input.name,
          saas_plan: input.saasPlan,
          document: input.document,
          phone: input.phone,
          email: input.email,
          ...(input.lessonRules ? { lesson_rules: input.lessonRules } : {}),
          ...(input.logoSport ? { logo_sport: input.logoSport } : {}),
        })
        .eq("id", orgId)
        .select("*")
        .maybeSingle(),
    );

    if (!organization) {
      throw Errors.notFound("Organization");
    }

    return organization;
  }
}

export const organizationService = new OrganizationService();
