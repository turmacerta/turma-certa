"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth-layout";
import { CodeInput, InlineAlert } from "@/components/ui";
import { authErrorMessage, safeNext, TOTP_LENGTH } from "@/lib/auth";
import { homeAfterLogin } from "@/lib/auth-redirect";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

function SecondFactorForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      return;
    }
    void supabase.auth.mfa.listFactors().then(({ data }) => {
      const factor = data?.totp.find((item) => item.status === "verified");
      if (!factor) {
        router.replace(next || ROUTES.home);
        return;
      }
      setFactorId(factor.id);
    });
  }, [next, router]);

  async function verify(value: string) {
    const supabase = createBrowserSupabase();
    if (!supabase || !factorId || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: value });
    if (verifyError) {
      setBusy(false);
      setCode("");
      setError(authErrorMessage(verifyError, t));
      return;
    }
    router.replace(next || (await homeAfterLogin()));
  }

  async function useAnotherAccount() {
    await createBrowserSupabase()?.auth.signOut();
    router.replace(ROUTES.login);
  }

  return (
    <AuthLayout
      title={t.auth.twoFactor.title}
      description={t.auth.twoFactor.description}
      footer={
        <button type="button" onClick={useAnotherAccount} className="font-bold text-primary hover:underline">
          {t.auth.twoFactor.otherAccount}
        </button>
      }
    >
      <div className="grid gap-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <CodeInput length={TOTP_LENGTH} value={code} onChange={setCode} onComplete={verify} disabled={busy || !factorId} label={t.auth.twoFactor.codeLabel} />
        {busy ? <p className="text-center text-sm text-muted">{t.auth.twoFactor.verifying}</p> : null}
        {error ? <InlineAlert tone="danger" title={error} /> : null}
        <p className="text-center text-xs text-muted">{t.auth.twoFactor.lostAccess}</p>
      </div>
    </AuthLayout>
  );
}

export default function SecondFactorPage() {
  return (
    <Suspense>
      <SecondFactorForm />
    </Suspense>
  );
}
