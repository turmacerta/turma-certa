import { api } from "./api";

export async function homeAfterLogin() {
  try {
    const me = await api<{ isPlatformAdmin: boolean }>("/api/v1/me");
    return me.isPlatformAdmin ? "/admin" : "/app";
  } catch {
    return "/app";
  }
}
