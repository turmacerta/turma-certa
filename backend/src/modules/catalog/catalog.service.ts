import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import type { z } from "zod";
import type { levelSchema, spaceSchema, sportSchema, unitSchema } from "./catalog.schema";

export class CatalogService {
  async listUnits(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("units")
        .select("*, spaces(*)")
        .eq("organization_id", orgId)
        .order("name"),
    );
  }

  async createUnit(orgId: string, input: z.infer<typeof unitSchema>) {
    return unwrap(
      await getAdminClient()
        .from("units")
        .insert({
          organization_id: orgId,
          name: input.name,
          address: input.address ?? null,
        })
        .select("*")
        .single(),
    );
  }

  async createSpace(orgId: string, unitId: string, input: z.infer<typeof spaceSchema>) {
    const unit = unwrap(
      await getAdminClient()
        .from("units")
        .select("id")
        .eq("id", unitId)
        .eq("organization_id", orgId)
        .maybeSingle(),
    );

    if (!unit) {
      throw Errors.notFound("Unidade");
    }

    return unwrap(
      await getAdminClient()
        .from("spaces")
        .insert({ unit_id: unitId, name: input.name })
        .select("*")
        .single(),
    );
  }

  async listSports(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("sports")
        .select("*")
        .eq("organization_id", orgId)
        .order("name"),
    );
  }

  async createSport(orgId: string, input: z.infer<typeof sportSchema>) {
    return unwrap(
      await getAdminClient()
        .from("sports")
        .insert({ organization_id: orgId, name: input.name })
        .select("*")
        .single(),
    );
  }

  async listLevels(orgId: string) {
    return unwrap(
      await getAdminClient()
        .from("class_levels")
        .select("*, sport:sports(id, name)")
        .eq("organization_id", orgId)
        .order("rank"),
    );
  }

  async createLevel(orgId: string, input: z.infer<typeof levelSchema>) {
    return unwrap(
      await getAdminClient()
        .from("class_levels")
        .insert({
          organization_id: orgId,
          name: input.name,
          rank: input.rank,
          sport_id: input.sportId ?? null,
        })
        .select("*")
        .single(),
    );
  }
}

export const catalogService = new CatalogService();
