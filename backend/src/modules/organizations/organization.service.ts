import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
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
      throw Errors.notFound("Organização");
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

    return organization;
  }

  async update(orgId: string, input: UpdateInput) {
    const organization = unwrap(
      await getAdminClient()
        .from("organizations")
        .update({
          name: input.name,
          saas_plan: input.saasPlan,
          document: input.document,
          phone: input.phone,
          email: input.email,
        })
        .eq("id", orgId)
        .select("*")
        .maybeSingle(),
    );

    if (!organization) {
      throw Errors.notFound("Organização");
    }

    return organization;
  }
}

export const organizationService = new OrganizationService();
