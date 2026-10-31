"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout, AuthLink } from "@/components/auth-layout";
import { Button, Field, InlineAlert, PasswordField } from "@/components/ui";
import { authErrorMessage, isEmailNotConfirmed, isValidEmail, needsSecondFactor, safeNext } from "@/lib/auth";
import { homeAfterLogin } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const notice = searchParams.get("notice");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const valid = isValidEmail(email) && password.length > 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || loading) {
      return;
    }
    setError(null);
    setUnconfirmed(false);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError(t.auth.supabaseMissing);
      return;
    }
    setLoading(true);
    const { error: signError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signError) {
      setLoading(false);
      setUnconfirmed(isEmailNotConfirmed(signError));
      setError(authErrorMessage(signError, t));
      return;
    }
    if (await needsSecondFactor(supabase)) {
      router.replace(`${ROUTES.twoFactor}${next ? `?next=${encodeURIComponent(next)}` : ""}`);
      return;
    }
    router.replace(next || (await homeAfterLogin()));
  }

  const notices = {
    "password-updated": { tone: "success" as const, title: t.auth.login.passwordUpdatedTitle, text: t.auth.login.passwordUpdatedText },
    "link-expired": { tone: "warning" as const, title: t.auth.login.linkExpiredTitle, text: t.auth.login.linkExpiredText },
    "signed-out": { tone: "info" as const, title: t.auth.login.signedOutTitle, text: t.auth.login.signedOutText },
  };
  const activeNotice = notice && notice in notices ? notices[notice as keyof typeof notices] : null;

  return (
    <AuthLayout
      title={t.auth.login.title}
      description={t.auth.login.description}
      footer={
        <>
          {t.auth.login.noAccount} <AuthLink href={ROUTES.signup}>{t.auth.login.createAccount}</AuthLink>
        </>
      }
    >
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        {activeNotice ? (
          <InlineAlert tone={activeNotice.tone} title={activeNotice.title}>
            {activeNotice.text}
          </InlineAlert>
        ) : null}
        <Field
          label={t.auth.email}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t.auth.emailPlaceholder}
        />
        <div className="grid gap-2">
          <PasswordField label={t.auth.password} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Link
            href={`${ROUTES.forgotPassword}${email ? `?email=${encodeURIComponent(email.trim())}` : ""}`}
            className="justify-self-end text-xs font-bold text-primary hover:underline"
          >
            {t.auth.login.forgot}
          </Link>
        </div>
        {error ? (
          <InlineAlert
            tone="danger"
            title={error}
            action={
              unconfirmed ? (
                <Link href={`${ROUTES.verifyEmail}?email=${encodeURIComponent(email.trim())}`} className="text-sm font-bold text-ink underline">
                  {t.auth.login.confirmNow}
                </Link>
              ) : undefined
            }
          />
        ) : null}
        <Button type="submit" size="lg" block disabled={!valid} loading={loading}>
          {loading ? t.auth.login.submitting : t.auth.login.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
