"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { BrandMark } from "@/components/brand";
import { Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api<{ isPlatformAdmin: boolean }>("/api/v1/me")
      .then((me) => {
        if (me.isPlatformAdmin) {
          setReady(true);
        } else {
          router.replace(ROUTES.home);
        }
      })
      .catch(() => router.replace(ROUTES.login));
  }, [router]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center p-8" aria-busy aria-label={t.admin.opening}>
        <div className="grid justify-items-center gap-6">
          <BrandMark />
          <Skeleton className="h-2 w-40" />
        </div>
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
