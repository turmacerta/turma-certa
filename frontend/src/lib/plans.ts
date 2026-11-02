import type { MemberTag, SaasPlan } from "./types";

export const PRICING = {
  baseCents: { school: 4900, autonomous: 2900 } as Record<SaasPlan, number>,
  tagCents: { manager: 1900, teacher: 1200, student: 0 } as Record<MemberTag, number>,
};
