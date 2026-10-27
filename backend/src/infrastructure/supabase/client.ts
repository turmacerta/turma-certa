import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "../../config/env";
import { Errors } from "../../shared/errors";

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw Errors.supabaseMissing();
  }

  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export function getAuthClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw Errors.supabaseMissing();
  }

  if (!authClient) {
    authClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return authClient;
}

export function unwrap<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) {
    throw Errors.database(result.error.message);
  }
  return result.data;
}
