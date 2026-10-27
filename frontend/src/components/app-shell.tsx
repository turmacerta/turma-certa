"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  Volleyball,
} from "lucide-react";
import { BrandMark } from "./brand";
import { cn } from "./ui";
import { createBrowserSupabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/app", label: "Painel", icon: LayoutDashboard },
  { href: "/app/turmas", label: "Turmas", icon: Volleyball },
  { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/app/alunos", label: "Alunos", icon: Users },
  { href: "/app/professores", label: "Professores", icon: GraduationCap },
  { href: "/app/faturamento", label: "Faturamento", icon: CreditCard },
  { href: "/app/configuracoes", label: "Espaços e níveis", icon: Settings },
];

export function AppShell({
  orgName,
  isPlatformAdmin,
  children,
}: {
  orgName?: string;
  isPlatformAdmin?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line bg-white/80 p-5 lg:border-b-0 lg:border-r">
        <BrandMark />
        {orgName ? (
          <p className="mt-3 truncate text-xs uppercase tracking-[0.18em] text-muted">
            {orgName}
          </p>
        ) : null}
        <nav className="mt-8 grid gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-forest text-sand" : "text-ink hover:bg-sand",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {isPlatformAdmin ? (
          <Link
            href="/admin"
            className="mt-8 flex items-center gap-2 text-sm font-semibold text-clay hover:text-clay-dark"
          >
            Backoffice Turma Certa
          </Link>
        ) : null}
        <button
          type="button"
          onClick={signOut}
          className={isPlatformAdmin ? "mt-4 flex items-center gap-2 text-sm text-muted hover:text-ink" : "mt-8 flex items-center gap-2 text-sm text-muted hover:text-ink"}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <main className="p-5 lg:p-8">{children}</main>
    </div>
  );
}
