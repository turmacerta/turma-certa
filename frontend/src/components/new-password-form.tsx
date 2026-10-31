"use client";

import { useState } from "react";
import { authErrorMessage, isStrongPassword } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { PasswordRules } from "./password-rules";
import { Button, InlineAlert, PasswordField } from "./ui";

export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const matches = password.length > 0 && password === confirmation;
  const valid = isStrongPassword(password) && matches;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createBrowserSupabase();
    if (!valid || loading || !supabase) {
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(authErrorMessage(updateError, t));
      return;
    }
    onDone();
  }

  return (
    <form className="grid gap-5" onSubmit={onSubmit} noValidate>
      <PasswordField
        label={t.auth.reset.newPassword}
        autoComplete="new-password"
        autoFocus
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordRules value={password} />
      <PasswordField
        label={t.auth.reset.confirmNewPassword}
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && confirmation && !matches ? t.auth.signup.passwordsDiffer : null}
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Button type="submit" size="lg" block disabled={!valid} loading={loading}>
        {t.auth.reset.submit}
      </Button>
    </form>
  );
}
