import { getAdminClient, unwrap } from "../infrastructure/supabase/client";

export type LessonRules = {
  noticeHours: number;
  creditDays: number;
  maxCredits: number;
  sameLevel: boolean;
  anyUnit: boolean;
  rainCredit: boolean;
};

export const DEFAULT_RULES: LessonRules = { noticeHours: 6, creditDays: 30, maxCredits: 4, sameLevel: true, anyUnit: false, rainCredit: true };

export async function lessonRules(orgId: string): Promise<LessonRules> {
  const organization = unwrap(await getAdminClient().from("organizations").select("*").eq("id", orgId).maybeSingle());
  return { ...DEFAULT_RULES, ...((organization?.lesson_rules as Partial<LessonRules> | undefined) ?? {}) };
}

export function expiresIn(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
