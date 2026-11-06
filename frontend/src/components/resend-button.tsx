"use client";

import { useEffect, useState } from "react";
import { RESEND_COOLDOWN_SECONDS } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function ResendButton({ onResend }: { onResend: () => Promise<boolean> }) {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  async function resend() {
    setSending(true);
    const ok = await onResend();
    setSending(false);
    if (ok) {
      setSeconds(RESEND_COOLDOWN_SECONDS);
    }
  }

  if (seconds > 0) {
    return <span className="tabular text-muted">{t.auth.resendIn(String(seconds).padStart(2, "0"))}</span>;
  }

  return (
    <button type="button" onClick={resend} disabled={sending} className="font-bold text-primary hover:underline disabled:opacity-50">
      {sending ? t.auth.sending : t.auth.resend}
    </button>
  );
}
