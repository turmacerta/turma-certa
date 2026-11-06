"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { useToast } from "@/components/overlay";
import { ResendButton } from "@/components/resend-button";
import { CodeInput, InlineAlert } from "@/components/ui";
import { authErrorMessage, OTP_LENGTH } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

function VerifyEmailForm() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify(value: string) {
    const supabase = createBrowserSupabase();
    if (!supabase || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: value, type: "signup" });
    if (verifyError) {
      setBusy(false);
      setCode("");
      setError(authErrorMessage(verifyError, t));
      return;
    }
    toast({ message: t.auth.verifyEmail.confirmed });
    router.replace(`${ROUTES.home}?welcome=1`);
  }

  async function resend() {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      return false;
    }
    const { error: resendError } = await supabase.auth.resend({ type: "signup", email });
    if (resendError) {
      setError(authErrorMessage(resendError, t));
      return false;
    }
    toast({ message: t.auth.verifyEmail.resent, tone: "info" });
    return true;
  }

  return (
    <AuthLayout
      title={t.auth.verifyEmail.title}
      description={
        <>
          {t.auth.verifyEmail.sentTo(OTP_LENGTH)} <span className="font-semibold text-ink">{email || t.auth.verifyEmail.yourEmail}</span>.{" "}
          {t.auth.verifyEmail.validity}
        </>
      }
      step={{ current: 3, total: 3 }}
      backHref={ROUTES.signup}
      footer={
        <div className="grid gap-2">
          <ResendButton onResend={resend} />
          <span className="text-xs">{t.auth.verifyEmail.notArrived}</span>
        </div>
      }
    >
      <div className="grid gap-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
          <MailCheck className="h-8 w-8" />
        </div>
        <CodeInput length={OTP_LENGTH} value={code} onChange={setCode} onComplete={verify} disabled={busy || !email} label={t.auth.verifyEmail.codeLabel} />
        {busy ? <p className="text-center text-sm text-muted">{t.auth.verifyEmail.confirming}</p> : null}
        {error ? <InlineAlert tone="danger" title={error} /> : null}
        <p className="text-center text-xs text-muted">{t.auth.verifyEmail.linkAlso}</p>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
