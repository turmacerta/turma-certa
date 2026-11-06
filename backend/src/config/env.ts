import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function parseEmailList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

const corsList = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3001),
  /** String or string[] for the cors package. */
  corsOrigin: corsList.length <= 1 ? (corsList[0] ?? "http://localhost:3000") : corsList,
  /** Canonical web app origin (invites / redirects). */
  appOrigin: corsList[0] ?? "http://localhost:3000",
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  platformAdminEmails: parseEmailList(process.env.PLATFORM_ADMIN_EMAILS),
  leadsEmail: process.env.LEADS_EMAIL ?? "turmacerta1910@gmail.com",
  cronSecret: process.env.CRON_SECRET ?? "",
};

export function isSupabaseConfigured(): boolean {
  return (
    env.supabaseUrl.startsWith("https://") &&
    !env.supabaseUrl.includes("YOUR_PROJECT") &&
    env.supabaseAnonKey.length > 20 &&
    env.supabaseServiceRoleKey.length > 20
  );
}
