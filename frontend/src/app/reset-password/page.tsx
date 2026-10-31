"use client";

import { useRouter } from "next/navigation";
import { AuthLayout, AuthLink } from "@/components/auth-layout";
import { NewPasswordForm } from "@/components/new-password-form";
import { useToast } from "@/components/overlay";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();

  return (
    <AuthLayout title={t.auth.reset.title} description={t.auth.reset.description} footer={<AuthLink href={ROUTES.login}>{t.common.cancel}</AuthLink>}>
      <NewPasswordForm
        onDone={() => {
          toast({ message: t.auth.reset.done });
          router.replace(ROUTES.home);
        }}
      />
    </AuthLayout>
  );
}
