import { createApp } from "./app";
import { env, isSupabaseConfigured } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Turma Certa API on http://localhost:${env.port}`);
  console.log(
    `Supabase: ${isSupabaseConfigured() ? "configurado" : "pendente (veja o README)"}`,
  );
});
