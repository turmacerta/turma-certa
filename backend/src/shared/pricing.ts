import { getAdminClient } from "../infrastructure/supabase/client";
import { Errors } from "./errors";
import { orgRoles, resolveRole, TAGS, type MemberRole, type MemberTag } from "./permissions";
import { planOf, type SaasPlan } from "./plans";

export type TagPrices = Partial<Record<MemberTag, number>>;

export const PRICING = {
  base_cents: { school: 4900, autonomous: 2900 } as Record<SaasPlan, number>,
  tag_prices: { manager: 1900, teacher: 1200, student: 0 } as TagPrices,
};

function isMissingTable(message: string) {
  return message.includes("schema cache") || message.includes("does not exist");
}

function monthStart(date = new Date()) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1)).toISOString().slice(0, 10);
}

export async function recordActivity(orgId: string, profileId: string, tag: MemberTag) {
  const { error } = await getAdminClient()
    .from("membership_activity")
    .upsert({ organization_id: orgId, profile_id: profileId, tag, month: monthStart() }, { onConflict: "organization_id,profile_id,tag,month", ignoreDuplicates: true });
  if (error && !isMissingTable(error.message)) throw Errors.database(error.message);
}

export async function tagUsage(orgId: string) {
  const roles = await orgRoles(orgId);
  const { data: members, error } = await getAdminClient().from("organization_members").select("*").eq("organization_id", orgId);
  if (error) throw Errors.database(error.message);

  const seen = new Map<MemberTag, Set<string>>(TAGS.map((tag) => [tag, new Set<string>()]));
  for (const member of members ?? []) {
    if (member.status === "removed") continue;
    const role = resolveRole(roles, member.role as MemberRole, member.role_id as string | null);
    if (role) seen.get(role.tag)?.add(member.profile_id as string);
  }

  const activity = await getAdminClient().from("membership_activity").select("profile_id, tag").eq("organization_id", orgId).eq("month", monthStart());
  for (const row of activity.data ?? []) {
    seen.get(row.tag as MemberTag)?.add(row.profile_id as string);
  }

  const { count } = await getAdminClient().from("students").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  return { counts: Object.fromEntries(TAGS.map((tag) => [tag, seen.get(tag)?.size ?? 0])) as Record<MemberTag, number>, students: count ?? 0 };
}

export async function monthlyEstimate(orgId: string) {
  const pricing = PRICING;
  const [usage, plan] = await Promise.all([tagUsage(orgId), planOf(orgId)]);
  const base = pricing.base_cents[plan];
  const lines = [...TAGS].reverse().filter((tag) => tag !== "student" && plan === "school").map((tag) => {
    const unit = pricing.tag_prices[tag] ?? 0;
    const count = usage.counts[tag];
    return { tag, count, unit_cents: unit, total_cents: unit * count };
  });
  return {
    base_cents: base,
    saas_plan: plan,
    lines,
    students: usage.students,
    total_cents: base + lines.reduce((sum, line) => sum + line.total_cents, 0),
  };
}
