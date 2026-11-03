"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { LoadingMark } from "@/components/brand";
import { api } from "@/lib/api";
import { readStorage } from "@/lib/client-store";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { CUSTOMER_MODE_KEY } from "@/lib/staff";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ isPlatformAdmin: boolean }>("/api/v1/me")
      .then((me) => {
        if (me.isPlatformAdmin && readStorage(CUSTOMER_MODE_KEY) !== "on") {
          setReady(true);
        } else {
          router.replace(ROUTES.home);
        }
      })
      .catch(() => router.replace(ROUTES.login));
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center p-8">
        <LoadingMark label={t.admin.opening} />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
