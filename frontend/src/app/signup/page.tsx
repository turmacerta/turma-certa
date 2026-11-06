"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout, AuthLink } from "@/components/auth-layout";
import { PasswordRules } from "@/components/password-rules";
import { Button, Checkbox, Field, InlineAlert, PasswordField } from "@/components/ui";
import { authErrorMessage, isStrongPassword, isValidEmail } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignUpPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, confirmation: false });

  const nameValid = fullName.trim().split(/\s+/).length >= 2;
  const emailValid = isValidEmail(email);
  const passwordsMatch = password.length > 0 && password === confirmation;
  const stepTwoValid = isStrongPassword(password) && passwordsMatch && accepted;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stepTwoValid || loading) {
      return;
    }
    setError(null);
    setAlreadyExists(false);
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError(t.auth.supabaseMissing);
      return;
    }
    setLoading(true);
    const { data, error: signError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${ROUTES.home}`,
      },
    });
    if (signError || (data.user && data.user.identities?.length === 0)) {
      setLoading(false);
      const exists = !signError || /already registered/i.test(signError.message);
      setAlreadyExists(exists);
      setError(exists ? t.auth.signup.alreadyExists : authErrorMessage(signError, t));
      return;
    }
    if (data.session) {
      router.replace(`${ROUTES.home}?welcome=1`);
      return;
    }
    router.replace(`${ROUTES.verifyEmail}?email=${encodeURIComponent(email.trim())}`);
  }

  const footer = (
    <>
      {t.auth.signup.hasAccount} <AuthLink href={ROUTES.login}>{t.auth.signup.signIn}</AuthLink>
    </>
  );

  if (step === 1) {
    return (
      <AuthLayout title={t.auth.signup.title} description={t.auth.signup.description} step={{ current: 1, total: 3 }} footer={footer}>
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (nameValid && emailValid) setStep(2);
          }}
        >
          <Field
            label={t.auth.signup.fullName}
            autoComplete="name"
            autoFocus
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t.auth.signup.fullNamePlaceholder}
            hint={t.auth.signup.fullNameHint}
          />
          <Field
            label={t.auth.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched((value) => ({ ...value, email: true }))}
            error={touched.email && email && !emailValid ? t.auth.checkEmail : null}
            placeholder={t.auth.emailPlaceholder}
          />
          <Button type="submit" size="lg" block disabled={!nameValid || !emailValid}>
            {t.common.continue}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t.auth.signup.passwordTitle}
      description={
        <>
          {t.auth.signup.accountFor} <span className="font-semibold text-ink">{email.trim()}</span>.{" "}
          <button type="button" className="font-bold text-primary hover:underline" onClick={() => setStep(1)}>
            {t.auth.signup.change}
          </button>
        </>
      }
      step={{ current: 2, total: 3 }}
      footer={footer}
    >
      <form className="grid gap-5" onSubmit={onSubmit} noValidate>
        <PasswordField label={t.auth.password} autoComplete="new-password" autoFocus value={password} onChange={(event) => setPassword(event.target.value)} />
        <PasswordRules value={password} />
        <PasswordField
          label={t.auth.signup.confirmPassword}
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          onBlur={() => setTouched((value) => ({ ...value, confirmation: true }))}
          error={touched.confirmation && confirmation && !passwordsMatch ? t.auth.signup.passwordsDiffer : null}
          hint={passwordsMatch ? t.auth.signup.passwordsMatch : undefined}
        />
        <Checkbox
          checked={accepted}
          onChange={setAccepted}
          label={
            <>
              {t.auth.signup.acceptPrefix} <span className="underline">{t.auth.signup.terms}</span> {t.auth.signup.and}{" "}
              <span className="underline">{t.auth.signup.privacy}</span>
            </>
          }
        />
        {error ? (
          <InlineAlert
            tone="danger"
            title={error}
            action={
              alreadyExists ? (
                <Link href={`${ROUTES.login}?email=${encodeURIComponent(email.trim())}`} className="text-sm font-bold text-ink underline">
                  {t.auth.signup.signIn}
                </Link>
              ) : undefined
            }
          />
        ) : null}
        <Button type="submit" size="lg" block disabled={!stepTwoValid} loading={loading}>
          {loading ? t.auth.signup.submitting : t.auth.signup.submit}
        </Button>
        {!stepTwoValid && password ? (
          <p className="-mt-2 text-center text-xs text-muted">
            {!isStrongPassword(password) ? t.auth.signup.missingRules : !passwordsMatch ? t.auth.signup.missingMatch : t.auth.signup.missingTerms}
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}
