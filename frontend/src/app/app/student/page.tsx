"use client";

import Link from "next/link";
import { ArrowRight, CalendarSync, Package, Ticket } from "lucide-react";
import { useLessonActions } from "@/components/lesson-actions";
import { LessonRow } from "@/components/lesson-row";
import { useStudentPortal } from "@/components/student-portal";
import { Button, Card, PageHeader } from "@/components/ui";
import { daysUntil } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { SportBadge } from "@/lib/sports";

export default function StudentHomePage() {
  const { t, format } = useI18n();
  const { data } = useStudentPortal();
  const { cancelLesson } = useLessonActions();
  if (!data) return null;
  const now = new Date();
  const upcoming = data.lessons.filter((lesson) => new Date(lesson.endsAt) > now && lesson.status === "booked");
  const next = upcoming[0];
  const planEnd = data.subscription?.current_period_end;
  const planDays = planEnd ? daysUntil(planEnd) : null;

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader eyebrow={data.student.organization?.name} title={t.studentArea.greeting(data.student.full_name.split(" ")[0] ?? "")} />

      {next ? (
        <Card className="grid gap-4">
          <p className="text-sm text-muted">{t.studentArea.nextLesson}</p>
          <div className="flex items-center gap-4">
            <SportBadge name={next.sport} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="display text-2xl font-semibold">
                {format.relativeDay(next.startsAt)}, {format.time(next.startsAt)}
              </p>
              <p className="truncate text-sm text-muted">{[next.title, next.teacher, next.space].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div>
            <Button variant="outline" onClick={() => void cancelLesson(next)}>
              {t.studentArea.cantGo}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Shortcut href={ROUTES.studentMakeup} icon={<CalendarSync className="h-5 w-5" />} title={t.studentArea.makeup} text={t.studentArea.creditsAvailable(data.credits.balance)} />
        <Shortcut href={ROUTES.studentLessons} icon={<Ticket className="h-5 w-5" />} title={t.studentArea.myLessons} text={t.studentArea.upcoming(upcoming.length)} />
        <Shortcut
          href={ROUTES.studentPlan}
          icon={<Package className="h-5 w-5" />}
          title={t.studentArea.myPlan}
          text={planEnd && planDays !== null && planDays <= 7 ? t.studentArea.expiresOn(format.date(planEnd)) : (data.subscription?.billing_plan?.name ?? t.studentArea.noPlan)}
          warn={planDays !== null && planDays <= 7}
        />
      </div>

      {upcoming.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.studentArea.thisWeek}</h2>
          {upcoming.slice(0, 4).map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onCancel={() => void cancelLesson(lesson)} />
          ))}
        </section>
      ) : null}

      {data.notifications.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.studentArea.notices}</h2>
          {data.notifications.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted">{item.body}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function Shortcut({ href, icon, title, text, warn }: { href: string; icon: React.ReactNode; title: string; text: string; warn?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-soft transition hover:border-primary/40">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className={`block truncate text-xs ${warn ? "font-semibold text-warning" : "text-muted"}`}>{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" />
    </Link>
  );
}
