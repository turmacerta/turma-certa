"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, School } from "lucide-react";
import { BrandMark } from "./brand";
import { cn } from "./ui";
import { createBrowserSupabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Clientes", icon: LayoutDashboard },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase?.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-line bg-forest p-5 text-sand lg:border-b-0">
        <BrandMark />
        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-sand/70">
          Backoffice
        </p>
        <nav className="mt-8 grid gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium",
                  active ? "bg-sand text-forest" : "text-sand/80 hover:bg-white/10",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/app"
          className="mt-8 flex items-center gap-2 text-sm text-sand/70 hover:text-sand"
        >
          <School className="h-4 w-4" />
          App da escola
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="mt-4 flex items-center gap-2 text-sm text-sand/70 hover:text-sand"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <main className="p-5 lg:p-8">{children}</main>
    </div>
  );
}
