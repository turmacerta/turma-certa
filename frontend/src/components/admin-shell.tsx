"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, School } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { BrandMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { useConfirm } from "./overlay";
import { ThemeToggle } from "./theme-toggle";
import { Badge, cn } from "./ui";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const confirm = useConfirm();

  async function signOut() {
    const ok = await confirm({ title: t.shell.signOutTitle, description: t.shell.signOutText, confirmLabel: t.common.signOut });
    if (!ok) return;
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  const linkClass = "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition";
  const clientsActive = pathname === ROUTES.admin || pathname.startsWith(`${ROUTES.admin}/`);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="flex flex-col gap-6 border-b border-line bg-surface/80 px-3 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-2">
          <Link href={ROUTES.admin}>
            <BrandMark />
          </Link>
          <Badge tone="accent">{t.nav.backoffice}</Badge>
        </div>
        <nav className="grid gap-1" aria-label={t.nav.main}>
          <Link
            href={ROUTES.admin}
            aria-current={clientsActive ? "page" : undefined}
            className={cn(linkClass, clientsActive ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:bg-surface-2 hover:text-ink")}
          >
            <LayoutDashboard className="h-[18px] w-[18px]" />
            {t.admin.clients}
          </Link>
          <Link href={ROUTES.home} className={cn(linkClass, "text-muted hover:bg-surface-2 hover:text-ink")}>
            <School className="h-[18px] w-[18px]" />
            {t.admin.schoolApp}
          </Link>
        </nav>
        <div className="mt-auto grid gap-3 px-2">
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
          <button type="button" onClick={signOut} className={cn(linkClass, "-mx-2 text-muted hover:bg-surface-2 hover:text-danger")}>
            <LogOut className="h-[18px] w-[18px]" />
            {t.common.signOut}
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
