"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ArrowRight, CalendarClock, CalendarPlus, CircleDollarSign, RefreshCcw, UserPlus, Users, Volleyball } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, OccupancyBar, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { classTitle, scheduleSummary } from "@/lib/classes";
import { useNow } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { addDays, daysUntil } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { HOME_BY_PERSONA, ROUTES } from "@/lib/navigation";
import { SportBadge } from "@/lib/sports";
import type { BillingSummary, ClassRow, SessionRow, Student } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Tone = "neutral" | "primary" | "warning" | "danger" | "success";

function periodOfDay(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "morning" as const;
  if (hour < 18) return "afternoon" as const;
  return "evening" as const;
}

export default function HomePage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { t, locale, format } = useI18n();
  const { orgId, orgName, persona, profile } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const now = useNow();

  useEffect(() => {
    if (persona !== "manager") {
      router.replace(HOME_BY_PERSONA[persona]);
    }
  }, [persona, router]);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
  }, []);

  const classes = useApi<ClassRow[]>(`${base}/classes`);
  const billing = useApi<BillingSummary>(`${base}/billing`);
  const students = useApi<Student[]>(`${base}/students`);
  const today = useApi<SessionRow[]>(`${base}/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);

  const stats = useMemo(() => {
    const rows = classes.data ?? [];
    const enrolled = rows.reduce((sum, item) => sum + item.occupancy.enrolled_count, 0);
    const capacity = rows.reduce((sum, item) => sum + item.occupancy.max_capacity, 0);
    const vacancies = rows.reduce((sum, item) => sum + Math.max(item.occupancy.vacancies, 0), 0);
    const attention = rows
      .filter((item) => item.occupancy.enrolled_count / item.occupancy.max_capacity < 0.5)
      .sort((a, b) => a.occupancy.enrolled_count / a.occupancy.max_capacity - b.occupancy.enrolled_count / b.occupancy.max_capacity)
      .slice(0, 4);
    const overdue = (billing.data?.invoices ?? []).filter((invoice) => invoice.status === "overdue");
    const subscriptions = (billing.data?.subscriptions ?? []) as Array<{ billing_plan?: { price_cents?: number } | null; status?: string }>;
    const mrr = subscriptions
      .filter((item) => item.status === "active" || item.status === "past_due")
      .reduce((sum, item) => sum + (item.billing_plan?.price_cents ?? 0), 0);
    return { occupancy: capacity ? Math.round((enrolled / capacity) * 100) : 0, vacancies, attention, overdue, mrr };
  }, [classes.data, billing.data]);

  const sessionsToday = (today.data ?? []).filter((session) => !session.cancelled_at);
  const nextSession = sessionsToday.find((session) => new Date(session.ends_at) > (now ?? new Date()));
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const loading = classes.loading || billing.loading;
  const classById = new Map((classes.data ?? []).map((item) => [item.id, item]));

  async function renew(id: string, name?: string) {
    const ok = await confirm({ title: t.home.renewTitle, description: t.home.renewText(name ?? t.home.theStudent), confirmLabel: t.common.renew });
    if (!ok) {
      return;
    }
    try {
      await api(`${base}/billing/subscriptions/${id}/renew`, { method: "POST" });
      toast({ message: t.home.renewed });
      await billing.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  if (persona !== "manager") {
    return null;
  }

  const shortcuts = [
    { href: `${ROUTES.students}?new=1`, icon: UserPlus, ...t.home.shortcuts.student },
    { href: `${ROUTES.classes}?new=1`, icon: Volleyball, ...t.home.shortcuts.class },
    { href: ROUTES.schedule, icon: CalendarClock, ...t.home.shortcuts.attendance },
    { href: ROUTES.billing, icon: CircleDollarSign, ...t.home.shortcuts.renewals },
  ];

  return (
    <div className="grid gap-8 animate-fade-up">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{now ? format.longDate(now) : " "}</p>
          <h1 className="display mt-1 text-3xl font-semibold md:text-4xl">{t.home.greeting(periodOfDay(now ?? new Date()), firstName)}</h1>
          <p className="mt-2 text-muted">
            {loading
              ? t.home.loadingSummary
              : sessionsToday.length
                ? t.home.todaySummary(orgName, t.common.lessons(sessionsToday.length), nextSession ? format.time(nextSession.starts_at) : null)
                : t.home.noLessonsToday(orgName)}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(ROUTES.schedule)}>
          <CalendarPlus className="h-4 w-4" />
          {t.home.viewSchedule}
        </Button>
      </section>

      {!loading && (classes.data?.length ?? 0) === 0 ? (
        <Card className="grid gap-4 border-primary/30">
          <p className="display text-xl font-semibold">{t.home.setupTitle}</p>
          <ol className="grid list-decimal gap-2 pl-5 text-sm">
            {t.home.setupSteps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <div>
            <Button onClick={() => router.push(`${ROUTES.classes}?new=1`)}>
              {t.home.setupAction}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={t.home.metrics}>
        <BigNumber
          loading={loading}
          label={t.home.occupancy}
          value={`${stats.occupancy}%`}
          hint={t.home.occupancyHint(stats.vacancies)}
          tone={stats.occupancy >= 75 ? "success" : stats.occupancy >= 50 ? "primary" : "warning"}
          href={ROUTES.classes}
        />
        <BigNumber loading={loading} label={t.home.mrr} value={format.currency(stats.mrr)} hint={t.home.mrrHint} tone="primary" href={ROUTES.billing} />
        <BigNumber
          loading={loading}
          label={t.home.renewals}
          value={format.number(billing.data?.renewalsDue.length ?? 0)}
          hint={t.home.renewalsHint}
          tone={(billing.data?.renewalsDue.length ?? 0) > 0 ? "warning" : "neutral"}
          href={ROUTES.billing}
        />
        <BigNumber
          loading={loading}
          label={t.home.overdue}
          value={format.currency(stats.overdue.reduce((sum, item) => sum + item.amount_cents, 0))}
          hint={t.home.overdueHint(stats.overdue.length)}
          tone={stats.overdue.length ? "danger" : "neutral"}
          href={`${ROUTES.billing}?tab=invoices`}
        />
      </section>

      <section aria-label={t.home.shortcutsTitle}>
        <h2 className="mb-3 text-sm font-semibold text-muted">{t.home.shortcutsTitle}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 shadow-soft transition hover:border-primary/40"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-on-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.title}</span>
                <span className="block truncate text-xs text-muted">{item.text}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="grid content-start gap-4">
          <div className="flex items-center justify-between">
            <h2 className="display text-xl font-semibold">{t.home.todayLessons}</h2>
            <Link href={ROUTES.schedule} className="text-sm font-semibold text-primary hover:underline">
              {t.home.fullSchedule}
            </Link>
          </div>
          {today.loading ? (
            <div className="grid gap-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : today.error ? (
            <ErrorState message={today.error} onRetry={() => void today.reload()} />
          ) : sessionsToday.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title={t.home.freeDayTitle} description={t.home.freeDayText} />
          ) : (
            <ul className="grid gap-2">
              {sessionsToday.map((session) => {
                const past = now ? new Date(session.ends_at) < now : false;
                const live = now ? new Date(session.starts_at) <= now && new Date(session.ends_at) > now : false;
                const classRow = classById.get(session.class_group?.id ?? "");
                return (
                  <li key={session.id} className={`flex items-center gap-3 rounded-2xl border border-line p-3 ${past ? "opacity-60" : ""}`}>
                    <span className="tabular w-14 shrink-0 text-sm font-semibold">{format.time(session.starts_at)}</span>
                    <SportBadge name={classRow?.sport?.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{classRow ? classTitle(classRow, t) : session.class_group?.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {session.teacher?.full_name ?? t.common.noTeacher}
                        {session.space ? ` · ${session.space.name}` : ""}
                      </span>
                    </span>
                    {live ? <Badge tone="success">{t.common.now}</Badge> : null}
                    {classRow ? (
                      <span className="tabular hidden text-xs text-muted sm:block">
                        {classRow.occupancy.enrolled_count}/{classRow.occupancy.max_capacity}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid content-start gap-6">
          <Card className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl font-semibold">{t.home.fillTitle}</h2>
              <Link href={ROUTES.classes} className="text-sm font-semibold text-primary hover:underline">
                {t.common.seeAll}
              </Link>
            </div>
            {loading ? (
              <Skeleton className="h-28" />
            ) : stats.attention.length === 0 ? (
              <p className="text-sm text-muted">{t.home.allAboveHalf}</p>
            ) : (
              <ul className="grid gap-3">
                {stats.attention.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <SportBadge name={item.sport?.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{classTitle(item, t)}</p>
                      <p className="truncate text-xs text-muted">{scheduleSummary(item.class_schedules, locale, t.common.noSchedule)}</p>
                      <OccupancyBar enrolled={item.occupancy.enrolled_count} capacity={item.occupancy.max_capacity} compact />
                    </div>
                    <span className="tabular text-xs text-muted">
                      {item.occupancy.enrolled_count}/{item.occupancy.max_capacity}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="grid gap-4">
            <div className="flex items-center justify-between">
              <h2 className="display text-xl font-semibold">{t.home.expiringTitle}</h2>
              <Badge tone="neutral">{billing.data?.renewalsDue.length ?? 0}</Badge>
            </div>
            {billing.loading ? (
              <Skeleton className="h-28" />
            ) : (billing.data?.renewalsDue.length ?? 0) === 0 ? (
              <p className="text-sm text-muted">{t.home.noneExpiring}</p>
            ) : (
              <ul className="grid gap-2">
                {billing.data!.renewalsDue.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <Avatar name={item.student?.full_name ?? "?"} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.student?.full_name}</span>
                      <span className="block truncate text-xs text-muted">
                        {item.billing_plan?.name} ·{" "}
                        {daysUntil(item.current_period_end) === 0 ? t.home.expiresToday : t.home.expiresOn(format.date(item.current_period_end))}
                      </span>
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => void renew(item.id, item.student?.full_name)}>
                      <RefreshCcw className="h-3.5 w-3.5" />
                      {t.common.renew}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-ink">
              <Users className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <p className="display tabular text-2xl font-semibold">{students.data ? format.number(students.data.length) : t.common.empty}</p>
              <p className="text-xs text-muted">{t.home.registeredStudents}</p>
            </div>
            <Link href={ROUTES.students} className="text-sm font-semibold text-primary hover:underline">
              {t.common.open}
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BigNumber({ label, value, hint, tone, href, loading }: { label: string; value: string; hint: string; tone: Tone; href: string; loading: boolean }) {
  const dot = { neutral: "bg-line", primary: "bg-primary", warning: "bg-warning", danger: "bg-danger", success: "bg-success" }[tone];
  return (
    <Link href={href} className="group grid gap-2 rounded-3xl border border-line bg-surface p-5 shadow-soft transition hover:border-primary/40">
      <span className="flex items-center gap-2 text-sm text-muted">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
        <ArrowRight className="ml-auto h-4 w-4 opacity-0 transition group-hover:opacity-100" />
      </span>
      {loading ? <Skeleton className="h-9 w-32" /> : <span className="display tabular text-3xl font-semibold text-ink">{value}</span>}
      <span className="text-xs text-muted">{hint}</span>
    </Link>
  );
}
