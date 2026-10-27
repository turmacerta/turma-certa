import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { getAdminClient, getAuthClient, unwrap } from "../infrastructure/supabase/client";
import { Errors } from "../shared/errors";
import { asyncHandler } from "../shared/http";

type MemberRole = "owner" | "admin" | "teacher" | "student";

const STAFF_ROLES: MemberRole[] = ["owner", "admin", "teacher"];

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

  req.user = {
    id: data.user.id,
    email: data.user.email,
    isPlatformAdmin: await resolvePlatformAdmin(data.user.id, data.user.email),
  };

  const memberships = unwrap(
    await getAdminClient()
      .from("organization_members")
      .select("organization_id, role")
      .eq("profile_id", data.user.id),
  );

  req.memberships = (memberships ?? []).map((row) => ({
    organizationId: row.organization_id as string,
    role: row.role as MemberRole,
  }));

  next();
});

export function requireOrgStaff(req: Request, _res: Response, next: NextFunction) {
  const orgId = req.params.orgId;
  if (!orgId) {
    throw Errors.validation({ orgId: "Organização obrigatória." });
  }

  const membership = req.memberships?.find((item) => item.organizationId === orgId);
  if (!membership || !STAFF_ROLES.includes(membership.role)) {
    throw Errors.forbidden();
  }

  next();
}

export function requireOrgMember(req: Request, _res: Response, next: NextFunction) {
  const orgId = req.params.orgId;
  if (!orgId) {
    throw Errors.validation({ orgId: "Organização obrigatória." });
  }

  const membership = req.memberships?.find((item) => item.organizationId === orgId);
  if (!membership) {
    throw Errors.forbidden();
  }

  next();
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
