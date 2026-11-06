import { getAdminClient, unwrap } from "../../infrastructure/supabase/client";
import { Errors } from "../../shared/errors";
import { assertPlanCapacity } from "../../shared/plans";
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
    await assertPlanCapacity(orgId, "units");
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
      throw Errors.notFound("Unit");
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
  private async ensureOwned(table: string, orgId: string, id: string, entity: string) {
    const row = unwrap(await getAdminClient().from(table).select("id").eq("organization_id", orgId).eq("id", id).maybeSingle());
    if (!row) throw Errors.notFound(entity);
  }

  private async assertUnused(column: string, value: string, code: string, activeOnly = true) {
    let query = getAdminClient().from("class_groups").select("id").eq(column, value).limit(1);
    if (activeOnly) query = query.eq("is_active", true);
    const used = unwrap(await query);
    if ((used ?? []).length) throw Errors.conflict("In use by a class.", code);
  }

  async updateUnit(orgId: string, unitId: string, input: { name?: string; address?: string }) {
    await this.ensureOwned("units", orgId, unitId, "Unit");
    return unwrap(
      await getAdminClient()
        .from("units")
        .update({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.address !== undefined ? { address: input.address || null } : {}) })
        .eq("id", unitId)
        .select("*")
        .single(),
    );
  }

  async deleteUnit(orgId: string, unitId: string) {
    await this.ensureOwned("units", orgId, unitId, "Unit");
    await this.assertUnused("unit_id", unitId, "UNIT_IN_USE");
    unwrap(await getAdminClient().from("units").delete().eq("id", unitId));
    return { id: unitId };
  }

  private async ownedSpace(orgId: string, spaceId: string) {
    const space = unwrap(await getAdminClient().from("spaces").select("id, unit:units!inner(organization_id)").eq("id", spaceId).eq("unit.organization_id", orgId).maybeSingle());
    if (!space) throw Errors.notFound("Space");
  }

  async updateSpace(orgId: string, spaceId: string, input: { name: string }) {
    await this.ownedSpace(orgId, spaceId);
    return unwrap(await getAdminClient().from("spaces").update({ name: input.name }).eq("id", spaceId).select("*").single());
  }

  async deleteSpace(orgId: string, spaceId: string) {
    await this.ownedSpace(orgId, spaceId);
    await this.assertUnused("space_id", spaceId, "SPACE_IN_USE");
    unwrap(await getAdminClient().from("spaces").delete().eq("id", spaceId));
    return { id: spaceId };
  }

  async updateSport(orgId: string, sportId: string, input: { name: string }) {
    await this.ensureOwned("sports", orgId, sportId, "Sport");
    return unwrap(await getAdminClient().from("sports").update({ name: input.name }).eq("id", sportId).select("*").single());
  }

  async deleteSport(orgId: string, sportId: string) {
    await this.ensureOwned("sports", orgId, sportId, "Sport");
    await this.assertUnused("sport_id", sportId, "SPORT_IN_USE", false);
    unwrap(await getAdminClient().from("class_levels").delete().eq("organization_id", orgId).eq("sport_id", sportId));
    unwrap(await getAdminClient().from("sports").delete().eq("id", sportId));
    return { id: sportId };
  }

  async updateLevel(orgId: string, levelId: string, input: { name?: string; rank?: number }) {
    await this.ensureOwned("class_levels", orgId, levelId, "Level");
    return unwrap(
      await getAdminClient()
        .from("class_levels")
        .update({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.rank !== undefined ? { rank: input.rank } : {}) })
        .eq("id", levelId)
        .select("*")
        .single(),
    );
  }

  async deleteLevel(orgId: string, levelId: string) {
    await this.ensureOwned("class_levels", orgId, levelId, "Level");
    await this.assertUnused("class_level_id", levelId, "LEVEL_IN_USE");
    unwrap(await getAdminClient().from("class_levels").delete().eq("id", levelId));
    return { id: levelId };
  }

}

export const catalogService = new CatalogService();
