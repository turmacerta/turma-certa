export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url.startsWith("https://") && !url.includes("YOUR_PROJECT") && key.length > 20;
}

export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
