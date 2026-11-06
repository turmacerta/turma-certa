import { api } from "./api";
import { writeStorage } from "./client-store";
import { CUSTOMER_MODE_KEY, SUPPORT_ORG_KEY, VIEW_AS_KEY, VIEW_TEACHER_KEY } from "./staff";

export async function homeAfterLogin() {
  try {
    await api("/api/v1/me/session", { method: "POST" });
    const me = await api<{ isPlatformAdmin: boolean }>("/api/v1/me");
    if (me.isPlatformAdmin) {
      // Fresh staff login should land in the backoffice, not a leftover customer-mode session.
      writeStorage(CUSTOMER_MODE_KEY, "");
      writeStorage(SUPPORT_ORG_KEY, "");
      writeStorage(VIEW_AS_KEY, "");
      writeStorage(VIEW_TEACHER_KEY, "");
      return "/admin";
    }
    return "/app";
  } catch {
    return "/app";
  }
}
