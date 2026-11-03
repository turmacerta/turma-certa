"use client";

import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "./ui";

export function Preferences({ className }: { className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <LanguageSwitch />
      <ThemeToggle />
    </div>
  );
}
