"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { KeyRound } from "lucide-react";
import { AuthLayout, AuthLink } from "@/components/auth-layout";
import { NewPasswordForm } from "@/components/new-password-form";
import { useToast } from "@/components/overlay";
import { ResendButton } from "@/components/resend-button";
import { Button, CodeInput, Field, InlineAlert } from "@/components/ui";
import { authErrorMessage, isValidEmail, OTP_LENGTH } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Step = "email" | "code" | "password";

function RecoverForm() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      setError(t.auth.supabaseMissing);
      return false;
    }
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${ROUTES.resetPassword}`,
    });
    if (sendError) {
      setError(authErrorMessage(sendError, t));
      return false;
    }
    return true;
  }

  async function onSubmitEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email) || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    const sent = await sendCode();
    setLoading(false);
    if (sent) {
      setStep("code");
    }
  }

  async function verify(value: string) {
    const supabase = createBrowserSupabase();
    if (!supabase || loading) {
      return;
    }
    setLoading(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: value, type: "recovery" });
    setLoading(false);
    if (verifyError) {
      setCode("");
      setError(authErrorMessage(verifyError, t));
      return;
    }
    setStep("password");
  }

  if (step === "email") {
    return (
      <AuthLayout title={t.auth.forgot.title} description={t.auth.forgot.description} backHref={ROUTES.login} step={{ current: 1, total: 3 }}>
        <form className="grid gap-5" onSubmit={onSubmitEmail} noValidate>
          <Field label={t.auth.email} type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />
          {error ? <InlineAlert tone="danger" title={error} /> : null}
          <Button type="submit" size="lg" block disabled={!isValidEmail(email)} loading={loading}>
            {t.auth.forgot.send}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (step === "code") {
    return (
      <AuthLayout
        title={t.auth.forgot.codeTitle}
        description={
          <>
            {t.auth.forgot.codeSentPrefix} <span className="font-semibold text-ink">{email.trim()}</span>, {t.auth.forgot.codeSentSuffix}{" "}
            <button
              type="button"
              className="font-bold text-primary hover:underline"
              onClick={() => {
                setCode("");
                setError(null);
                setStep("email");
              }}
            >
              {t.auth.forgot.changeEmail}
            </button>
          </>
        }
        step={{ current: 2, total: 3 }}
        footer={
          <ResendButton
            onResend={async () => {
              const sent = await sendCode();
              if (sent) toast({ message: t.auth.forgot.resent, tone: "info" });
              return sent;
            }}
          />
        }
      >
        <div className="grid gap-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
            <KeyRound className="h-8 w-8" />
          </div>
          <CodeInput length={OTP_LENGTH} value={code} onChange={setCode} onComplete={verify} disabled={loading} label={t.auth.forgot.codeLabel} />
          {loading ? <p className="text-center text-sm text-muted">{t.auth.forgot.verifying}</p> : null}
          {error ? <InlineAlert tone="danger" title={error} /> : null}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t.auth.reset.title}
      description={t.auth.reset.description}
      step={{ current: 3, total: 3 }}
      footer={<AuthLink href={ROUTES.login}>{t.common.cancel}</AuthLink>}
    >
      <NewPasswordForm
        onDone={() => {
          toast({ message: t.auth.reset.done });
          router.replace(ROUTES.home);
        }}
      />
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <RecoverForm />
    </Suspense>
  );
}
