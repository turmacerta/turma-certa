import { Router } from "express";
import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { asyncHandler, ok } from "../../shared/http";
import { requireAuth } from "../../middleware/auth";

export const meRouter = Router();

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
        .select("role, organization:organizations(id, name, slug, saas_plan)")
        .eq("profile_id", userId),
    );

    return ok(res, {
      profile,
      memberships: organizations ?? [],
      isPlatformAdmin: Boolean(req.user?.isPlatformAdmin),
    });
  }),
);
