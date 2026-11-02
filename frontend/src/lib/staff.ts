import { readStorage } from "./client-store";

export const VIEW_AS_KEY = "tc-view-as";
export const VIEW_TEACHER_KEY = "tc-view-teacher";
export const SUPPORT_ORG_KEY = "tc-support-org";
export const CUSTOMER_MODE_KEY = "tc-customer-mode";

export function actingHeaders(): Record<string, string> {
  if (typeof window === "undefined" || readStorage(CUSTOMER_MODE_KEY) !== "on") {
    return {};
  }
  const persona = readStorage(VIEW_AS_KEY);
  const role = persona === "teacher" || persona === "student" ? persona : "owner";
  const teacherId = role === "teacher" ? readStorage(VIEW_TEACHER_KEY) : null;
  return { "x-act-as": role, ...(teacherId ? { "x-act-as-teacher": teacherId } : {}) };
}
