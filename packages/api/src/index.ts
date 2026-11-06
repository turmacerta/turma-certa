import type { SupabaseClient } from "@supabase/supabase-js";

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

export type ApiClientOptions = {
  apiUrl: string;
  getAccessToken: () => Promise<string | null>;
  onSessionReplaced?: () => void | Promise<void>;
  extraHeaders?: () => Record<string, string>;
};

export function createApiClient(options: ApiClientOptions) {
  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await options.getAccessToken();
    let response: Response;
    try {
      response = await fetch(`${options.apiUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(options.extraHeaders?.() ?? {}),
          ...(init?.headers as Record<string, string> | undefined),
        },
      });
    } catch {
      throw new RequestError("Network error", 0, "NETWORK_ERROR");
    }

    const payload = (await response.json().catch(() => ({}))) as
      | { data: T }
      | { error: { code: string; message: string; details?: unknown } };

    if (!response.ok || "error" in payload) {
      const error = "error" in payload ? payload.error : undefined;
      if (response.status === 401 && error?.code === "SESSION_REPLACED") {
        await options.onSessionReplaced?.();
      }
      throw new RequestError(error?.message ?? "Request failed", response.status, error?.code, error?.details);
    }

    return payload.data;
  }

  async function claimSession() {
    return api("/api/v1/me/session", { method: "POST" });
  }

  return {
    api,
    claimSession,
    get: <T>(path: string) => api<T>(path),
    post: <T>(path: string, body?: unknown) =>
      api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
    patch: <T>(path: string, body?: unknown) =>
      api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) =>
      api<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
    del: <T>(path: string) => api<T>(path, { method: "DELETE" }),
  };
}

export function tokenFromSupabase(supabase: SupabaseClient | null) {
  return async () => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };
}
