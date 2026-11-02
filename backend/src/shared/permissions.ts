import { getAdminClient } from "../infrastructure/supabase/client";
import { Errors } from "./errors";

export type MemberRole = "owner" | "admin" | "teacher" | "student";
export type MemberTag = "student" | "teacher" | "manager";

export const PERMISSIONS = [
  "schedule.view_all",
  "schedule.manage",
  "schedule.cancel_own",
  "attendance.take",
  "classes.view_all",
  "classes.manage",
  "classes.create_own",
  "students.view_all",
  "students.manage",
  "teachers.view",
  "teachers.manage",
  "billing.view",
  "billing.manage",
  "settings.manage",
  "team.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const TAGS: MemberTag[] = ["student", "teacher", "manager"];

export const TAG_CEILING: Record<MemberTag, Permission[]> = {
  student: [],
  teacher: ["attendance.take", "schedule.cancel_own", "schedule.view_all", "classes.create_own", "students.view_all", "teachers.view"],
  manager: [...PERMISSIONS],
};

export const TAG_FOR_ROLE: Record<Exclude<MemberRole, "owner">, MemberTag> = {
  admin: "manager",
  teacher: "teacher",
  student: "student",
};

export const ROLE_FOR_TAG: Record<MemberTag, Exclude<MemberRole, "owner">> = {
  manager: "admin",
  teacher: "teacher",
  student: "student",
};

export const TEMPLATES: Array<{ template: string; name: string; tag: MemberTag; permissions: Permission[] }> = [
  { template: "manager", name: "Gestor", tag: "manager", permissions: [...PERMISSIONS] },
  { template: "teacher", name: "Professor", tag: "teacher", permissions: ["attendance.take", "schedule.cancel_own"] },
  { template: "student", name: "Aluno", tag: "student", permissions: [] },
];

export type OrgRole = { id: string; name: string; tag: MemberTag; template: string | null; permissions: Permission[] };

export function sanitize(list: string[]) {
  return PERMISSIONS.filter((permission) => list.includes(permission));
}

export function effective(tag: MemberTag, permissions: string[]) {
  return sanitize(permissions).filter((permission) => TAG_CEILING[tag].includes(permission));
}

function isMissingTable(message: string) {
  return message.includes("schema cache") || message.includes("does not exist");
}

function fallbackRoles(): OrgRole[] {
  return TEMPLATES.map((item) => ({ id: `template:${item.template}`, name: item.name, tag: item.tag, template: item.template, permissions: item.permissions }));
}

const ensured = new Set<string>();

export async function orgRoles(orgId: string): Promise<OrgRole[]> {
  const { data, error } = await getAdminClient()
    .from("organization_roles")
    .select("id, name, tag, template, permissions")
    .eq("organization_id", orgId)
    .order("created_at");

  if (error) {
    if (isMissingTable(error.message)) {
      return fallbackRoles();
    }
    throw Errors.database(error.message);
  }

  if (!ensured.has(orgId)) {
    const missing = TEMPLATES.filter((item) => !(data ?? []).some((row) => row.template === item.template));
    if (missing.length) {
      const { error: insertError } = await getAdminClient()
        .from("organization_roles")
        .insert(missing.map((item) => ({ organization_id: orgId, name: item.name, tag: item.tag, template: item.template, permissions: item.permissions })));
      if (insertError && !insertError.message.includes("duplicate")) {
        throw Errors.database(insertError.message);
      }
      ensured.add(orgId);
      return orgRoles(orgId);
    }
    ensured.add(orgId);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    tag: row.tag as MemberTag,
    template: (row.template as string | null) ?? null,
    permissions: effective(row.tag as MemberTag, (row.permissions as string[]) ?? []),
  }));
}

export function templateRole(roles: OrgRole[], role: Exclude<MemberRole, "owner">) {
  const template = role === "admin" ? "manager" : role;
  return roles.find((item) => item.template === template) ?? roles.find((item) => item.tag === TAG_FOR_ROLE[role]) ?? null;
}

export function resolveRole(roles: OrgRole[], role: MemberRole, roleId: string | null | undefined) {
  if (role === "owner") {
    return null;
  }
  return roles.find((item) => item.id === roleId) ?? templateRole(roles, role);
}

export function permissionsFor(roles: OrgRole[], role: MemberRole, roleId?: string | null): Permission[] {
  if (role === "owner") {
    return [...PERMISSIONS];
  }
  return resolveRole(roles, role, roleId)?.permissions ?? [];
}

export function previewPermissions(roles: OrgRole[]): Record<MemberRole, Permission[]> {
  return {
    owner: [...PERMISSIONS],
    admin: permissionsFor(roles, "admin"),
    teacher: permissionsFor(roles, "teacher"),
    student: [],
  };
}
