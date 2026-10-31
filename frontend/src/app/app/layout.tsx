"use client";

import { AppShell } from "@/components/app-shell";
import { OrgProvider } from "@/components/org-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
