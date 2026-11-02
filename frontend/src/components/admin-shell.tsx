"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppWindow, LogOut, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { BrandMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { useConfirm } from "./overlay";
import { ThemeToggle } from "./theme-toggle";
import { Button, IconButton } from "./ui";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();

  async function signOut() {
    const ok = await confirm({ title: t.shell.signOutTitle, description: t.shell.signOutText, confirmLabel: t.common.signOut });
    if (!ok) return;
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 py-3 lg:px-8">
          <Link href={ROUTES.admin} aria-label={t.admin.clients} className="mr-auto sm:mr-0">
            <BrandMark />
          </Link>
          <span className="mr-auto hidden h-7 items-center gap-1 rounded-full bg-primary-soft px-2.5 text-[11px] font-bold uppercase tracking-wider text-primary sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t.nav.backoffice}
          </span>
          <Button size="sm" variant="outline" onClick={() => router.push(ROUTES.home)} className="h-9">
            <AppWindow className="h-4 w-4" />
            <span className="hidden sm:inline">{t.admin.openApp}</span>
          </Button>
          <span className="hidden sm:contents"><LanguageSwitch /></span>
          <ThemeToggle />
          <IconButton label={t.common.signOut} onClick={() => void signOut()}>
            <LogOut className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
