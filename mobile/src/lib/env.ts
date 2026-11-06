export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
};

export function isConfigured() {
  return env.supabaseUrl.startsWith("https://") && env.supabaseAnonKey.length > 20;
}
