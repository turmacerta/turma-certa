"use client";

import { AppShell } from "@/components/app-shell";
import { OrgProvider, useOrg } from "@/components/org-provider";

function ShellWithOrg({ children }: { children: React.ReactNode }) {
  const { orgName, isPlatformAdmin } = useOrg();
  return (
    <AppShell orgName={orgName} isPlatformAdmin={isPlatformAdmin}>
      {children}
    </AppShell>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <ShellWithOrg>{children}</ShellWithOrg>
    </OrgProvider>
  );
}
