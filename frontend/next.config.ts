import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
loadEnvConfig(repoRoot, process.env.NODE_ENV !== "production", console, true);

const nextConfig: NextConfig = {
  agentRules: false,
  async redirects() {
    return [
      ["/cadastro", "/signup"],
      ["/recuperar-senha", "/forgot-password"],
      ["/nova-senha", "/reset-password"],
      ["/verificar-email", "/verify-email"],
      ["/login/verificacao", "/login/two-factor"],
      ["/app/agenda", "/app/schedule"],
      ["/app/turmas", "/app/classes"],
      ["/app/alunos", "/app/students"],
      ["/app/professores", "/app/teachers"],
      ["/app/faturamento", "/app/billing"],
      ["/app/financeiro", "/app/billing"],
      ["/app/configuracoes", "/app/settings"],
      ["/app/conta", "/app/account"],
      ["/app/hoje", "/app/today"],
      ["/app/aluno", "/app/student"],
      ["/app/aluno/:path*", "/app/student/:path*"],
    ].map(([source, destination]) => ({ source, destination, permanent: false }));
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
