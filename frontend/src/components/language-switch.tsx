"use client";

import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";
import { cn } from "./ui";

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.common.language} className={cn("inline-flex h-9 items-center rounded-full border border-line bg-surface-2 p-1", className)}>
      {LOCALE_OPTIONS.map((option) => {
        const active = option.value === locale;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.name}
            onClick={() => setLocale(option.value)}
            className={cn(
              "h-7 rounded-full px-2.5 text-xs font-bold transition",
              active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
