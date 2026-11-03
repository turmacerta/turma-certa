"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck2, CircleDollarSign, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { BrandMark, LogoMark } from "./brand";
import { Preferences } from "./preferences";

const HIGHLIGHT_ICONS = [Users, CalendarCheck2, CircleDollarSign];

export function AuthLayout({
  title,
  description,
  children,
  footer,
  backHref,
  step,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  backHref?: string;
  step?: { current: number; total: number };
}) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative m-3 hidden overflow-hidden rounded-[2rem] border border-line bg-surface p-12 text-ink lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/10 blur-3xl dark:bg-accent/15" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full bg-accent/25 blur-3xl dark:bg-primary/10" />
        <LogoMark className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] opacity-[0.06]" />
        <Link href="/" className="relative w-fit">
          <BrandMark />
        </Link>
        <div className="relative max-w-md">
          <h2 className="display text-5xl font-semibold leading-[1.05]">
            {t.auth.headline}
            <br />
            <span className="text-primary">{t.auth.headlineAccent}</span>
          </h2>
          <ul className="mt-10 grid gap-6">
            {t.auth.highlights.map((item, index) => {
              const Icon = HIGHLIGHT_ICONS[index] ?? Users;
              return (
                <li key={item.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="text-sm text-muted">{item.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="relative text-xs text-muted">© {new Date().getFullYear()} Turma Certa</p>
      </aside>
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
              <ArrowLeft className="h-4 w-4" />
              {t.common.back}
            </Link>
          ) : (
            <Link href="/" className="lg:hidden">
              <BrandMark />
            </Link>
          )}
          <Preferences className="ml-auto" />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {step ? (
            <div className="mb-6 flex items-center gap-2" aria-label={t.auth.stepOf(step.current, step.total)}>
              {Array.from({ length: step.total }, (_, index) => (
                <span key={index} className={`h-1.5 flex-1 rounded-full transition ${index < step.current ? "bg-primary" : "bg-line"}`} />
              ))}
            </div>
          ) : null}
          <div className="animate-fade-up">
            <h1 className="display text-4xl font-semibold">{title}</h1>
            {description ? <div className="mt-2 text-sm text-muted">{description}</div> : null}
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-8 text-center text-sm text-muted">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-bold text-primary hover:underline">
      {children}
    </Link>
  );
}
