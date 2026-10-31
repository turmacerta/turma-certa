"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, ChevronRight, MapPin } from "lucide-react";
import { AttendanceDrawer } from "@/components/attendance-drawer";
import { useOrg } from "@/components/org-provider";
import { Badge, Card, EmptyState, ErrorState, InlineAlert, LoadingList, PageHeader } from "@/components/ui";
import { classTitle } from "@/lib/classes";
import { useNow } from "@/lib/client-store";
import { addDays } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { SportBadge } from "@/lib/sports";
import type { ClassRow, SessionRow, Teacher } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function TeacherTodayPage() {
  const { t, format } = useI18n();
  const { orgId, profile, realPersona } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const now = useNow();
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const range = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: addDays(start, 1).toISOString() };
  }, []);

  const sessions = useApi<SessionRow[]>(`${base}/schedule?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`);
  const classes = useApi<ClassRow[]>(`${base}/classes`);
  const teachers = useApi<Teacher[]>(`${base}/teachers`);

  const preview = realPersona !== "teacher";
  const myTeacherId = teachers.data?.find((teacher) => teacher.profile_id && teacher.profile_id === profile?.id)?.id;
  const teacherId = myTeacherId ?? (preview ? (sessions.data ?? []).find((session) => session.teacher)?.teacher?.id : undefined);
  const teacherName = teachers.data?.find((teacher) => teacher.id === teacherId)?.full_name;

  const mine = (sessions.data ?? []).filter((session) => !session.cancelled_at && session.teacher?.id === teacherId);
  const classById = new Map((classes.data ?? []).map((item) => [item.id, item]));
  const students = mine.reduce((sum, session) => sum + (classById.get(session.class_group?.id ?? "")?.occupancy.enrolled_count ?? 0), 0);
  const firstName = (preview ? teacherName : profile?.full_name)?.split(" ")[0] ?? "";

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader
        eyebrow={now ? format.longDate(now) : t.common.today}
        title={t.today.title(firstName)}
        description={mine.length ? t.today.summary(t.common.lessons(mine.length), t.common.students(students)) : undefined}
      />

      {preview ? (
        <InlineAlert tone="info" title={t.today.previewTitle}>
          {t.today.previewText(teacherName ?? t.today.aTeacher)}
        </InlineAlert>
      ) : null}

      {sessions.loading ? <LoadingList rows={3} /> : null}
      {sessions.error ? <ErrorState message={sessions.error} onRetry={() => void sessions.reload()} /> : null}
      {!sessions.loading && !sessions.error && mine.length === 0 ? (
        <EmptyState icon={<CalendarCheck2 />} title={t.today.emptyTitle} description={t.today.emptyText} />
      ) : null}

      <ul className="grid gap-3">
        {mine.map((session) => {
          const classRow = classById.get(session.class_group?.id ?? "");
          const start = new Date(session.starts_at);
          const end = new Date(session.ends_at);
          const live = now ? start <= now && end > now : false;
          const past = now ? end < now : false;
          return (
            <li key={session.id}>
              <Card onClick={() => setSelected(session)} className={`flex items-center gap-4 ${past ? "opacity-75" : ""}`}>
                <div className="w-16 shrink-0 text-center">
                  <p className="display tabular text-xl font-semibold">{format.time(start)}</p>
                  <p className="tabular text-xs text-muted">{format.time(end)}</p>
                </div>
                <SportBadge name={classRow?.sport?.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{classRow ? classTitle(classRow, t) : session.class_group?.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.space?.name ?? t.today.noCourt}
                    {classRow ? ` · ${t.common.students(classRow.occupancy.enrolled_count)}` : ""}
                  </p>
                </div>
                {live ? <Badge tone="success">{t.common.now}</Badge> : past ? <Badge tone="warning">{t.today.takeAttendance}</Badge> : null}
                <ChevronRight className="h-5 w-5 text-muted" />
              </Card>
            </li>
          );
        })}
      </ul>

      <AttendanceDrawer orgId={orgId} session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
