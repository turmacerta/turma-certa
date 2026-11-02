import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { getAdminClient, getAuthClient, unwrap } from "../infrastructure/supabase/client";
import { Errors } from "../shared/errors";
import { asyncHandler } from "../shared/http";
import { orgRoles, permissionsFor, type MemberRole, type Permission } from "../shared/permissions";

const ACTING_ROLES: MemberRole[] = ["owner", "admin", "teacher", "student"];

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw Errors.unauthenticated();
  }

  const { data, error } = await getAuthClient().auth.getUser(token);
  if (error || !data.user) {
    throw Errors.unauthenticated();
  }

  const isStaff = await resolvePlatformAdmin(data.user.id, data.user.email);
  const actingRole = req.header("x-act-as") as MemberRole | undefined;
  const acting = isStaff && actingRole && ACTING_ROLES.includes(actingRole);

  req.user = {
    id: data.user.id,
    email: data.user.email,
    isStaff,
    isPlatformAdmin: isStaff && !acting,
    ...(acting ? { actingRole, actingTeacherId: req.header("x-act-as-teacher") || undefined } : {}),
  };

  const memberships = unwrap(
    await getAdminClient()
      .from("organization_members")
      .select("*")
      .eq("profile_id", data.user.id),
  );

  req.memberships = (memberships ?? []).map((row) => ({
    organizationId: row.organization_id as string,
    role: row.role as MemberRole,
    roleId: (row.role_id as string | null | undefined) ?? null,
  }));

  next();
});

export const requireOrgMember = asyncHandler(async (req, _res, next) => {
  const orgId = req.params.orgId;
  if (!orgId) {
    throw Errors.validation({ orgId: "Organization is required." });
  }

  const membership = req.memberships?.find((item) => item.organizationId === orgId);
  const role: MemberRole | null =
    req.user?.actingRole ?? membership?.role ?? (req.user?.isPlatformAdmin ? "owner" : null);

  if (!role) {
    throw Errors.forbidden();
  }

  req.orgRole = role;
  req.permissions = new Set(permissionsFor(await orgRoles(orgId), role, req.user?.actingRole ? null : membership?.roleId));
  next();
});

export function can(req: Request, permission: Permission) {
  return Boolean(req.permissions?.has(permission));
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!permissions.some((permission) => can(req, permission))) {
      throw Errors.forbidden();
    }
    next();
  };
}

export async function ownTeacherId(req: Request) {
  if (req.orgRole !== "teacher") {
    return null;
  }

  const actingTeacherId = req.user?.actingRole === "teacher" ? req.user.actingTeacherId : undefined;
  if (req.user?.actingRole && !actingTeacherId) {
    return null;
  }

  let lookup = getAdminClient().from("teachers").select("id").eq("organization_id", req.params.orgId);
  lookup = actingTeacherId ? lookup.eq("id", actingTeacherId) : lookup.eq("profile_id", req.user?.id ?? "");
  const teacher = unwrap(await lookup.maybeSingle());
  return (teacher?.id as string | undefined) ?? null;
}

export async function scopedTeacher(req: Request, viewAll: Permission) {
  if (can(req, viewAll)) {
    return typeof req.query.teacherId === "string" && req.query.teacherId ? req.query.teacherId : null;
  }

  const own = await ownTeacherId(req);
  if (!own) {
    throw Errors.forbidden();
  }
  return own;
}

function isMissingTable(message: string) {
  return message.includes("schema cache") || message.includes("does not exist");
}

async function resolvePlatformAdmin(userId: string, email: string | undefined) {
  const allowlisted = Boolean(email && env.platformAdminEmails.has(email.toLowerCase()));

  if (allowlisted) {
    const { error } = await getAdminClient()
      .from("platform_admins")
      .upsert({ profile_id: userId }, { onConflict: "profile_id" });
    if (error && !isMissingTable(error.message)) {
      throw Errors.database(error.message);
    }
    return true;
  }

  const { data, error } = await getAdminClient()
    .from("platform_admins")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error.message)) {
      return false;
    }
    throw Errors.database(error.message);
  }

  return Boolean(data);
}

export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.isPlatformAdmin) {
    throw Errors.forbidden();
  }

  next();
}
