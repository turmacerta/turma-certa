import { apiUrl } from "./env";
import { createBrowserSupabase } from "./supabase/client";

type ApiResult<T> = {
  data: T;
};

type ApiError = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

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

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createBrowserSupabase();
  if (!supabase) {
    return {};
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {};
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(await authHeader()),
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new RequestError("Network error", 0, "NETWORK_ERROR");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiResult<T> | ApiError;

  if (!response.ok || "error" in payload) {
    const error = "error" in payload ? payload.error : undefined;
    throw new RequestError(error?.message ?? "Request failed", response.status, error?.code, error?.details);
  }

  return payload.data;
}
