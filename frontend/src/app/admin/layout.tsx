"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { api } from "@/lib/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void api<{ isPlatformAdmin: boolean }>("/api/v1/me")
      .then((me) => {
        if (!me.isPlatformAdmin) {
          router.replace("/app");
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (!ready) {
    return <p className="p-8 text-muted">Abrindo o backoffice...</p>;
  }

  return <AdminShell>{children}</AdminShell>;
}
