"use client";

import { Fragment, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { OrgProvider } from "@/components/org-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AppShell>
        <Suspense>
          <QueryKeyed>{children}</QueryKeyed>
        </Suspense>
      </AppShell>
    </OrgProvider>
  );
}

function QueryKeyed({ children }: { children: React.ReactNode }) {
  const params = useSearchParams();
  return <Fragment key={params.toString()}>{children}</Fragment>;
}
