"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES, passwordScore } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { cn } from "./ui";

const LEVEL_TONES = ["bg-danger", "bg-danger", "bg-warning", "bg-primary", "bg-success"];

export function PasswordRules({ value }: { value: string }) {
  const { t } = useI18n();
  const score = passwordScore(value);
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-4" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1">
          {PASSWORD_RULES.map((rule, index) => (
            <span key={rule.id} className={cn("h-1.5 flex-1 rounded-full transition", index < score ? LEVEL_TONES[score] : "bg-line")} />
          ))}
        </div>
        <span className="w-24 text-right text-xs font-semibold text-muted">{value ? t.auth.strength[score] : ""}</span>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(value);
          return (
            <li key={rule.id} className={cn("flex items-center gap-2 text-xs", ok ? "text-success" : "text-muted")}>
              {ok ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {t.auth.rules[rule.id]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
