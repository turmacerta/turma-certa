"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "./ui";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? t.common.themeSwitchToLight : t.common.themeSwitchToDark}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full border border-line bg-surface-2 p-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        className,
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-full bg-primary text-on-primary shadow-sm transition-transform",
          dark && "translate-x-7",
        )}
      >
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
