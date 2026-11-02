import { env } from "../../config/env";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import {
  effective,
  orgRoles,
  resolveRole,
  ROLE_FOR_TAG,
  TAG_CEILING,
  type MemberRole,
  type MemberTag,
  type OrgRole,
  type Permission,
} from "../../shared/permissions";
import { PRICING, recordActivity } from "../../shared/pricing";

type Profile = { id: string; full_name: string; email: string | null; phone: string | null };
type MemberRow = { id: string; role: MemberRole; role_id: string | null; status: string | null; profile_id: string; created_at: string; profile: Profile | Profile[] | null };

function one<T>(value: T | T[] | null | undefined): T | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function assertWithin(granted: Set<string>, permissions: Permission[]) {
  if (permissions.some((permission) => !granted.has(permission))) {
    throw Errors.conflict("You cannot grant more than you have.", "PERMISSION_ESCALATION");
  }
}

async function findRole(orgId: string, roleId: string) {
  const role = (await orgRoles(orgId)).find((item) => item.id === roleId);
  if (!role) {
    throw Errors.notFound("Role");
  }
  return role;
}

export async function invite(email: string) {
  const normalized = email.toLowerCase();
  const profile = unwrap(await getAdminClient().from("profiles").select("id").ilike("email", normalized).maybeSingle()) as { id: string } | null;
  if (profile) {
    return { profileId: profile.id, invited: false };
  }
  const { data, error } = await getAdminClient().auth.admin.inviteUserByEmail(normalized, { redirectTo: `${env.corsOrigin}/reset-password` });
  if (error || !data.user) {
    throw Errors.conflict(error?.message ?? "Invite failed.", "INVITE_FAILED");
  }
  return { profileId: data.user.id, invited: true };
}

export class TeamService {
  async listRoles(orgId: string) {
    const [roles, members] = await Promise.all([orgRoles(orgId), getAdminClient().from("organization_members").select("*").eq("organization_id", orgId)]);
    const counts = new Map<string, number>();
    for (const member of members.data ?? []) {
      const role = resolveRole(roles, member.role as MemberRole, member.role_id as string | null);
      if (role) counts.set(role.id, (counts.get(role.id) ?? 0) + 1);
    }
    return {
      roles: roles.map((role) => ({ ...role, members: counts.get(role.id) ?? 0 })),
      ceilings: TAG_CEILING,
      prices: PRICING.tag_prices,
    };
  }

  async createRole(orgId: string, granted: Set<string>, input: { name: string; tag: MemberTag; permissions: string[] }) {
    const permissions = effective(input.tag, input.permissions);
    assertWithin(granted, permissions);
    return unwrap(
      await getAdminClient()
        .from("organization_roles")
        .insert({ organization_id: orgId, name: input.name, tag: input.tag, permissions })
        .select("id")
        .single(),
    );
  }

  async updateRole(orgId: string, granted: Set<string>, roleId: string, input: { name?: string; tag?: MemberTag; permissions?: string[] }) {
    const role = await findRole(orgId, roleId);
    if (role.template && input.tag && input.tag !== role.tag) {
      throw Errors.conflict("Default roles keep their access type.", "ROLE_TEMPLATE");
    }
    const tag = input.tag ?? role.tag;
    const permissions = input.permissions || tag !== role.tag ? effective(tag, input.permissions ?? role.permissions) : undefined;
    if (permissions) assertWithin(granted, permissions);
    return unwrap(
      await getAdminClient()
        .from("organization_roles")
        .update({ ...(input.name ? { name: input.name } : {}), ...(tag !== role.tag ? { tag } : {}), ...(permissions ? { permissions } : {}), updated_at: new Date().toISOString() })
        .eq("organization_id", orgId)
        .eq("id", roleId)
        .select("id")
        .single(),
    );
  }

  async deleteRole(orgId: string, roleId: string) {
    const role = await findRole(orgId, roleId);
    const used = unwrap(await getAdminClient().from("organization_members").select("id").eq("organization_id", orgId).eq("role_id", roleId).limit(1));
    if (role.template || (used ?? []).length) {
      throw Errors.conflict("Role in use.", "ROLE_IN_USE");
    }
    unwrap(await getAdminClient().from("organization_roles").delete().eq("organization_id", orgId).eq("id", roleId));
    return { id: roleId };
  }

  async listMembers(orgId: string) {
    const [roles, rows] = await Promise.all([
      orgRoles(orgId),
      getAdminClient().from("organization_members").select("*, profile:profiles(id, full_name, email, phone)").eq("organization_id", orgId).order("created_at"),
    ]);
    if (rows.error) throw Errors.database(rows.error.message);
    return ((rows.data ?? []) as MemberRow[])
      .filter((row) => row.status !== "removed")
      .map((row) => {
        const role = resolveRole(roles, row.role, row.role_id);
        return {
          id: row.id,
          owner: row.role === "owner",
          status: row.status ?? "active",
          profile: one(row.profile),
          role: role ? { id: role.id, name: role.name, tag: role.tag } : null,
        };
      });
  }

  async addMember(orgId: string, granted: Set<string>, email: string, roleId: string) {
    const role = await findRole(orgId, roleId);
    assertWithin(granted, role.permissions);
    const { profileId, invited } = await invite(email);

    const existing = unwrap(
      await getAdminClient().from("organization_members").select("id").eq("organization_id", orgId).eq("profile_id", profileId).maybeSingle(),
    );
    if (existing) {
      throw Errors.conflict("Already a member.", "ALREADY_MEMBER");
    }

    const member = unwrap(
      await getAdminClient()
        .from("organization_members")
        .insert({
          organization_id: orgId,
          profile_id: profileId,
          role: ROLE_FOR_TAG[role.tag],
          role_id: role.id,
          status: invited ? "invited" : "active",
          invited_at: invited ? new Date().toISOString() : null,
        })
        .select("id")
        .single(),
    ) as { id: string };

    await this.afterAssign(orgId, profileId, role);
    return member;
  }

  async setRole(orgId: string, granted: Set<string>, memberId: string, roleId: string) {
    const member = await this.member(orgId, memberId);
    const role = await findRole(orgId, roleId);
    assertWithin(granted, role.permissions);
    const previous = resolveRole(await orgRoles(orgId), member.role, member.role_id);
    if (previous) await recordActivity(orgId, member.profile_id, previous.tag);

    unwrap(
      await getAdminClient()
        .from("organization_members")
        .update({ role: ROLE_FOR_TAG[role.tag], role_id: role.id })
        .eq("id", memberId),
    );
    await this.afterAssign(orgId, member.profile_id, role);
    return { id: memberId };
  }

  async removeMember(orgId: string, memberId: string) {
    const member = await this.member(orgId, memberId);
    const role = resolveRole(await orgRoles(orgId), member.role, member.role_id);
    if (role) await recordActivity(orgId, member.profile_id, role.tag);
    unwrap(await getAdminClient().from("organization_members").delete().eq("id", memberId));
    return { id: memberId };
  }

  async ensureMember(orgId: string, email: string, template: "teacher" | "student") {
    const { profileId, invited } = await invite(email);
    const existing = unwrap(
      await getAdminClient().from("organization_members").select("id").eq("organization_id", orgId).eq("profile_id", profileId).maybeSingle(),
    );
    if (!existing) {
      const role = (await orgRoles(orgId)).find((item) => item.template === template);
      unwrap(
        await getAdminClient().from("organization_members").insert({
          organization_id: orgId,
          profile_id: profileId,
          role: template,
          ...(role && !role.id.startsWith("template:") ? { role_id: role.id } : {}),
          status: invited ? "invited" : "active",
          invited_at: invited ? new Date().toISOString() : null,
        }),
      );
      if (role) await recordActivity(orgId, profileId, role.tag);
    }
    return { profileId, invited };
  }

  async grantTeacherAccess(orgId: string, teacherId: string) {
    const teacher = unwrap(await getAdminClient().from("teachers").select("id, email").eq("organization_id", orgId).eq("id", teacherId).maybeSingle());
    if (!teacher) throw Errors.notFound("Teacher");
    if (!teacher.email) throw Errors.validation({ contact: "CONTACT_REQUIRED" });
    const { profileId, invited } = await this.ensureMember(orgId, teacher.email as string, "teacher");
    unwrap(await getAdminClient().from("teachers").update({ profile_id: profileId }).eq("id", teacherId));
    return { email: teacher.email as string, invited };
  }

  async grantStudentAccess(orgId: string, studentId: string) {
    const student = unwrap(
      await getAdminClient().from("students").select("*, guardian:guardians(id, email)").eq("organization_id", orgId).eq("id", studentId).maybeSingle(),
    );
    if (!student) throw Errors.notFound("Student");
    const guardian = one(student.guardian as { id: string; email: string | null } | Array<{ id: string; email: string | null }> | null);
    const email = guardian?.email ?? (student.email as string | null);
    if (!email) throw Errors.validation({ contact: "CONTACT_REQUIRED" });

    const { profileId, invited } = await this.ensureMember(orgId, email, "student");
    if (guardian) {
      unwrap(await getAdminClient().from("guardians").update({ profile_id: profileId }).eq("id", guardian.id));
    } else {
      unwrap(await getAdminClient().from("students").update({ profile_id: profileId }).eq("id", studentId));
    }
    return { email, invited };
  }

  async resendInvite(orgId: string, memberId: string) {
    const member = await this.member(orgId, memberId);
    const profile = unwrap(await getAdminClient().from("profiles").select("email").eq("id", member.profile_id).maybeSingle());
    if (!profile?.email) {
      throw Errors.notFound("Member");
    }
    const { error } = await getAdminClient().auth.admin.inviteUserByEmail(profile.email as string, { redirectTo: `${env.corsOrigin}/reset-password` });
    if (error) {
      const link = await getAdminClient().auth.resetPasswordForEmail(profile.email as string, { redirectTo: `${env.corsOrigin}/reset-password` });
      if (link.error) throw Errors.conflict(link.error.message, "INVITE_FAILED");
    }
    unwrap(await getAdminClient().from("organization_members").update({ invited_at: new Date().toISOString() }).eq("id", memberId));
    return { id: memberId };
  }

  private async member(orgId: string, memberId: string) {
    const member = unwrap(
      await getAdminClient().from("organization_members").select("*").eq("organization_id", orgId).eq("id", memberId).maybeSingle(),
    ) as (MemberRow & { profile_id: string }) | null;
    if (!member) {
      throw Errors.notFound("Member");
    }
    if (member.role === "owner") {
      throw Errors.forbidden();
    }
    return member;
  }

  private async afterAssign(orgId: string, profileId: string, role: OrgRole) {
    await recordActivity(orgId, profileId, role.tag);
    if (role.tag !== "teacher") return;
    const existing = unwrap(
      await getAdminClient().from("teachers").select("id").eq("organization_id", orgId).eq("profile_id", profileId).maybeSingle(),
    );
    if (existing) return;
    const profile = unwrap(await getAdminClient().from("profiles").select("full_name, email, phone").eq("id", profileId).maybeSingle());
    if (!profile) return;
    unwrap(
      await getAdminClient().from("teachers").insert({
        organization_id: orgId,
        profile_id: profileId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
      }),
    );
  }
}

export const teamService = new TeamService();
