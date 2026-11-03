import { Router, type Request } from "express";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { asyncHandler, ok } from "../../shared/http";
import { requireAuth } from "../../middleware/auth";
import { orgRoles, permissionsFor, previewPermissions, resolveRole, type MemberRole } from "../../shared/permissions";
import { parseBody } from "../../shared/http";
import { photoSchema } from "../../shared/photo.schema";
import { uploadPhoto } from "../../shared/photos";
import { scheduleService } from "../schedule/schedule.service";

export const meRouter = Router();

async function supportOrganization(req: Request) {
  const orgId = typeof req.query.supportOrgId === "string" ? req.query.supportOrgId : "";
  if (!req.user?.isPlatformAdmin || !orgId) {
    return null;
  }
  return unwrap(
    await getAdminClient().from("organizations").select("*").eq("id", orgId).maybeSingle(),
  ) as { id: string; name: string; slug: string; saas_plan: string; logo_sport?: string | null } | null;
}

meRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      throw Errors.unauthenticated();
    }

    const profile = unwrap(
      await getAdminClient()
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url")
        .eq("id", userId)
        .maybeSingle(),
    );

    const organizations = unwrap(
      await getAdminClient()
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("profile_id", userId),
    );

    if (profile?.email) {
      await getAdminClient().from("guardians").update({ profile_id: userId }).ilike("email", profile.email as string).is("profile_id", null);
      await getAdminClient().from("students").update({ profile_id: userId }).ilike("email", profile.email as string).is("profile_id", null).is("guardian_id", null);
      await getAdminClient().from("organization_members").update({ status: "active" }).eq("profile_id", userId).eq("status", "invited");
    }

    const teachers = unwrap(
      await getAdminClient()
        .from("teachers")
        .select("id, organization_id")
        .eq("profile_id", userId),
    );
    const teacherByOrg = new Map((teachers ?? []).map((row) => [row.organization_id as string, row.id as string]));

    const support = await supportOrganization(req);
    const orgIds = (organizations ?? [])
      .map((membership) => ((Array.isArray(membership.organization) ? membership.organization[0] : membership.organization) as { id: string } | null)?.id)
      .filter((id): id is string => Boolean(id));
    const rolesByOrg = new Map(
      await Promise.all((support ? [...new Set([...orgIds, support.id])] : orgIds).map(async (id) => [id, await orgRoles(id)] as const)),
    );

    return ok(res, {
      profile,
      memberships: (organizations ?? []).map((membership) => {
        const organization = (Array.isArray(membership.organization) ? membership.organization[0] : membership.organization) as { id: string } | null;
        const roles = organization ? (rolesByOrg.get(organization.id) ?? []) : [];
        const role = resolveRole(roles, membership.role as MemberRole, membership.role_id as string | null);
        return {
          role: membership.role,
          status: membership.status ?? "active",
          organization: membership.organization,
          teacher_id: organization ? (teacherByOrg.get(organization.id) ?? null) : null,
          org_role: role ? { id: role.id, name: role.name, tag: role.tag } : null,
          permissions: permissionsFor(roles, membership.role as MemberRole, membership.role_id as string | null),
          role_permissions: previewPermissions(roles),
        };
      }),
      isPlatformAdmin: Boolean(req.user?.isStaff),
      actingAs: req.user?.actingRole ?? null,
      supportOrganization: support ? { ...support, role_permissions: previewPermissions(rolesByOrg.get(support.id) ?? []) } : null,
    });
  }),
);

meRouter.get(
  "/schedule",
  requireAuth,
  asyncHandler(async (req, res) => {
    const from = String(req.query.from ?? new Date().toISOString());
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 14);
    const to = String(req.query.to ?? toDate.toISOString());
    return ok(res, await scheduleService.listForProfile(req.user?.id ?? "", from, to));
  }),
);

meRouter.put(
  "/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? "";
    const input = parseBody(photoSchema, req.body);
    const url = await uploadPhoto("profiles", userId, input.dataUrl);
    return ok(res, unwrap(await getAdminClient().from("profiles").update({ avatar_url: url }).eq("id", userId).select("id, avatar_url").single()));
  }),
);

meRouter.delete(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? "";
    const owned = unwrap(await getAdminClient().from("organization_members").select("id").eq("profile_id", userId).eq("role", "owner").limit(1));
    if ((owned ?? []).length) {
      throw Errors.conflict("Transfer or close your school first.", "OWNS_SCHOOL");
    }
    const { error } = await getAdminClient().auth.admin.deleteUser(userId);
    if (error) {
      throw Errors.database(error.message);
    }
    return ok(res, { id: userId });
  }),
);

meRouter.get(
  "/network",
  requireAuth,
  asyncHandler(async (req, res) => {
    const memberships = req.memberships ?? [];
    const allowed = (
      await Promise.all(
        memberships.map(async (membership) =>
          permissionsFor(await orgRoles(membership.organizationId), membership.role, membership.roleId).includes("classes.view_all") ? membership.organizationId : null,
        ),
      )
    ).filter((id): id is string => Boolean(id));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayKey = new Date().toISOString().slice(0, 10);

    const rows = await Promise.all(
      allowed.map(async (orgId) => {
        const [organization, students, occupancy, subscriptions, overdue, lessons] = await Promise.all([
          getAdminClient().from("organizations").select("id, name, saas_plan").eq("id", orgId).maybeSingle(),
          getAdminClient().from("students").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
          getAdminClient().from("class_group_occupancy").select("enrolled_count, max_capacity").eq("organization_id", orgId).eq("is_active", true),
          getAdminClient().from("student_subscriptions").select("status, billing_plan:billing_plans!inner(price_cents, organization_id)").eq("billing_plan.organization_id", orgId).in("status", ["active", "past_due"]),
          getAdminClient().from("invoices").select("amount_cents").eq("organization_id", orgId).in("status", ["pending", "overdue"]).lt("due_date", todayKey),
          getAdminClient().from("class_sessions").select("id, class_group:class_groups!inner(organization_id)", { count: "exact", head: true }).eq("class_group.organization_id", orgId).is("cancelled_at", null).gte("starts_at", today.toISOString()).lt("starts_at", tomorrow.toISOString()),
        ]);
        const enrolled = (occupancy.data ?? []).reduce((sum, row) => sum + ((row.enrolled_count as number) ?? 0), 0);
        const capacity = (occupancy.data ?? []).reduce((sum, row) => sum + ((row.max_capacity as number) ?? 0), 0);
        return {
          organization: organization.data,
          students: students.count ?? 0,
          occupancy: capacity ? Math.round((enrolled / capacity) * 100) : 0,
          mrr_cents: (subscriptions.data ?? []).reduce((sum, row) => sum + (((Array.isArray(row.billing_plan) ? row.billing_plan[0] : row.billing_plan) as { price_cents: number } | null)?.price_cents ?? 0), 0),
          overdue_cents: (overdue.data ?? []).reduce((sum, row) => sum + (row.amount_cents as number), 0),
          lessons_today: lessons.count ?? 0,
        };
      }),
    );
    return ok(res, rows.filter((row) => row.organization));
  }),
);
