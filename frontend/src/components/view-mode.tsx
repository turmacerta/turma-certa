"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { writeStorage } from "@/lib/client-store";
import { HOME_BY_PERSONA, ROUTES } from "@/lib/navigation";
import type { Persona } from "@/lib/types";
import { VIEW_AS_KEY } from "@/lib/staff";

export type ViewMode = Persona | "backoffice";

export function useViewModeNavigation() {
  const router = useRouter();
  return useCallback(
    (mode: ViewMode) => {
      if (mode === "backoffice") {
        router.push(ROUTES.admin);
        return;
      }
      writeStorage(VIEW_AS_KEY, mode);
      router.push(HOME_BY_PERSONA[mode]);
    },
    [router],
  );
}
