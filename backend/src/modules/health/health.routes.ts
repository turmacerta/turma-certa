import { Router } from "express";
import { isSupabaseConfigured } from "../../config/env";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    data: {
      ok: true,
      service: "turma-certa-api",
      supabase: isSupabaseConfigured(),
    },
  });
});
