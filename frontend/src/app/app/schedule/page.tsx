"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { SessionDrawer } from "@/components/session-drawer";
import { FilterChips, Toolbar, ViewSwitcher } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Badge, Button, cn, EmptyState, ErrorState, IconButton, LoadingList, PageHeader } from "@/components/ui";
import { classTitle } from "@/lib/classes";
import { useNow } from "@/lib/client-store";
import { addDays, dateKey, startOfWeek } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { sportMeta, SportIcon } from "@/lib/sports";
import type { ClassRow, SessionRow } from "@/lib/types";
import { useApi, usePersistentState } from "@/lib/use-api";

const MODES = ["week", "list", "day"] as const;
const HOUR_HEIGHT = 64;
const GUTTER = 56;

type Placed = { session: SessionRow; column: number; columns: number; start: Date; end: Date };

function layoutDay(sessions: SessionRow[]): Placed[] {
  const ends: number[] = [];
  const placed = [...sessions]
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((session) => {
      const start = new Date(session.starts_at);
      const end = new Date(session.ends_at);
      let column = ends.findIndex((value) => value <= start.getTime());
      if (column < 0) {
        column = ends.length;
        ends.push(end.getTime());
      } else {
        ends[column] = end.getTime();
      }
      return { session, column, start, end };
    });
  return placed.map((item) => ({
    ...item,
    columns: 1 + Math.max(...placed.filter((other) => other.start < item.end && other.end > item.start).map((other) => other.column)),
  }));
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function SchedulePage() {
  const { t, format } = useI18n();
  const { orgId, persona, realPersona, saasPlan, teacherId, can } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const isTeacher = !can("schedule.view_all");
  const ownAgenda = isTeacher && realPersona === "teacher";
  const [mode, setMode] = usePersistentState(`tc-view-schedule-${persona}`, isTeacher ? "list" : "week", MODES);
  const [anchor, setAnchor] = useState(() => new Date());
  const [teacher, setTeacher] = useState("all");
  const [school, setSchool] = useState("all");
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const now = useNow();

  const range = useMemo(() => {
    if (mode === "week") {
      return { start: startOfWeek(anchor), days: 7 };
    }
    return { start: startOfDay(anchor), days: mode === "list" ? 14 : 1 };
  }, [anchor, mode]);

  const query = `from=${encodeURIComponent(range.start.toISOString())}&to=${encodeURIComponent(addDays(range.start, range.days).toISOString())}`;
  const previewScope = isTeacher && !ownAgenda ? (teacherId ? `teacherId=${teacherId}` : null) : "";
  const sessionsPath = ownAgenda ? `/api/v1/me/schedule?${query}` : previewScope === null ? null : `${base}/schedule?${query}${previewScope ? `&${previewScope}` : ""}`;
  const sessions = useApi<SessionRow[]>(sessionsPath);
  const classes = useApi<ClassRow[]>(previewScope === null ? null : `${base}/classes${previewScope ? `?${previewScope}` : ""}`);
  const classById = useMemo(() => new Map((classes.data ?? []).map((item) => [item.id, item])), [classes.data]);
  const loading = sessions.loading || sessionsPath === null;

  const titleOf = (session: SessionRow) => {
    const classRow = classById.get(session.class_group?.id ?? "");
    return classRow ? classTitle(classRow, t) : (session.class_group?.name ?? "");
  };
  const sportOf = (session: SessionRow) => classById.get(session.class_group?.id ?? "")?.sport?.name ?? null;

  const teachers = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions.data ?? []) {
      if (session.teacher) map.set(session.teacher.id, session.teacher.full_name);
    }
    return [...map.entries()];
  }, [sessions.data]);

  const schools = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of sessions.data ?? []) {
      const organization = session.class_group?.organization;
      if (organization) map.set(organization.id, organization.name);
    }
    return [...map.entries()];
  }, [sessions.data]);

  const showTeachers = !isTeacher && saasPlan === "school" && teachers.length > 1;
  const showSchools = ownAgenda && schools.length > 1;

  const visible = (sessions.data ?? [])
    .filter((session) => !showTeachers || teacher === "all" || session.teacher?.id === teacher)
    .filter((session) => !showSchools || school === "all" || session.class_group?.organization_id === school);

  const byDay = new Map<string, SessionRow[]>();
  for (const session of visible) {
    const key = dateKey(session.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), session]);
  }

  const days = Array.from({ length: range.days }, (_, index) => addDays(range.start, index));
  const todayKey = dateKey(new Date());
  const showsToday = days.some((day) => dateKey(day) === todayKey);
  const step = mode === "day" ? 1 : mode === "list" ? 14 : 7;
  const title = mode === "day" ? format.longDate(range.start) : format.range(range.start, addDays(range.start, range.days - 1));
  const placed = mode === "day" ? layoutDay(visible) : [];
  const firstHour = Math.min(6, ...placed.map((item) => item.start.getHours()));
  const lastHour = Math.max(22, ...placed.map((item) => item.end.getHours() + (item.end.getMinutes() ? 1 : 0)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, index) => firstHour + index);

  const detailLine = (session: SessionRow) => {
    const parts = [isTeacher ? (session.space?.name ?? t.schedule.noCourt) : (session.teacher?.full_name ?? t.common.noTeacher)];
    if (!isTeacher && session.space) parts.push(session.space.name);
    if (showSchools && session.class_group?.organization) parts.push(session.class_group.organization.name);
    return parts.join(" · ");
  };

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader
        title={isTeacher ? t.nav.mySchedule : t.schedule.title}
        description={ownAgenda ? t.schedule.teacherDescription : t.schedule.description}
      />

      <Toolbar>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          <IconButton label={t.common.previous} className="h-8 w-8" onClick={() => setAnchor(addDays(anchor, -step))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <p className="tabular min-w-36 px-1 text-center text-sm font-semibold" aria-live="polite">
            {title}
          </p>
          <IconButton label={t.common.next} className="h-8 w-8" onClick={() => setAnchor(addDays(anchor, step))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        {showsToday ? null : (
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            {t.common.today}
          </Button>
        )}
        <div className="ml-auto">
          <ViewSwitcher value={mode} onChange={setMode} modes={MODES} />
        </div>
      </Toolbar>

      {showTeachers ? (
        <FilterChips
          value={teacher}
          onChange={setTeacher}
          options={[{ value: "all", label: t.schedule.allTeachers }, ...teachers.map(([id, name]) => ({ value: id, label: name.split(" ")[0] ?? name }))]}
        />
      ) : null}
      {showSchools ? (
        <FilterChips value={school} onChange={setSchool} options={[{ value: "all", label: t.schedule.allSchools }, ...schools.map(([id, name]) => ({ value: id, label: name }))]} />
      ) : null}

      {loading ? <LoadingList rows={4} /> : null}
      {sessions.error ? <ErrorState message={sessions.error} onRetry={() => void sessions.reload()} /> : null}

      {!loading && !sessions.error && visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={t.schedule.emptyTitle}
          description={isTeacher ? t.schedule.teacherEmptyText : t.schedule.emptyText}
        />
      ) : null}

      {!loading && visible.length > 0 && mode === "week" ? (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft">
          <div className="grid min-w-[900px] grid-cols-7 divide-x divide-line">
            {days.map((day) => {
              const key = dateKey(day);
              const isToday = key === todayKey;
              return (
                <div key={key} className="flex min-h-80 flex-col">
                  <div className={cn("border-b border-line px-3 py-3 text-center", isToday && "bg-primary-soft")}>
                    <p className="text-xs font-semibold uppercase text-muted">{format.weekdayShort(day.getDay())}</p>
                    <p className={cn("display tabular text-xl font-semibold", isToday && "text-primary")}>{day.getDate()}</p>
                  </div>
                  <div className="grid content-start gap-2 p-2">
                    {(byDay.get(key) ?? []).map((session) => (
                      <SessionChip
                        key={session.id}
                        session={session}
                        title={titleOf(session)}
                        sport={sportOf(session)}
                        detail={isTeacher ? (session.space?.name ?? "") : (session.teacher?.full_name?.split(" ")[0] ?? t.common.noTeacher)}
                        onClick={() => setSelected(session)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!loading && visible.length > 0 && mode === "list" ? (
        <div className="grid grid-cols-1 gap-6">
          {days
            .filter((day) => byDay.has(dateKey(day)))
            .map((day) => {
              const key = dateKey(day);
              return (
                <section key={key} className="grid grid-cols-1 gap-2">
                  <h3 className={cn("text-sm font-semibold", key === todayKey ? "text-primary" : "text-muted")}>
                    {key === todayKey ? t.schedule.todayPrefix : ""}
                    {format.longDate(day)}
                  </h3>
                  <ul className="grid grid-cols-1 gap-2">
                    {(byDay.get(key) ?? []).map((session) => {
                      const start = new Date(session.starts_at);
                      const end = new Date(session.ends_at);
                      const live = now ? start <= now && end > now : false;
                      const pending = Boolean(now && isTeacher && key === todayKey && end <= now);
                      return (
                        <li key={session.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(session)}
                            className={cn(
                              "flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/40",
                              session.cancelled_at && "opacity-50",
                            )}
                          >
                            <span className="tabular w-24 shrink-0 text-sm font-semibold">
                              {format.time(start)}–{format.time(end)}
                            </span>
                            <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: sportMeta(sportOf(session)).color }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-semibold">{titleOf(session)}</span>
                              <span className="block truncate text-xs text-muted">{detailLine(session)}</span>
                            </span>
                            {session.cancelled_at ? (
                              <Badge tone="danger">{t.schedule.cancelled}</Badge>
                            ) : live ? (
                              <Badge tone="success">{t.common.now}</Badge>
                            ) : pending ? (
                              <Badge tone="warning">{t.schedule.takeAttendance}</Badge>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
        </div>
      ) : null}

      {!loading && visible.length > 0 && mode === "day" ? (
        <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft">
          <div className="relative grid" style={{ gridTemplateRows: `repeat(${hours.length}, ${HOUR_HEIGHT}px)` }}>
            {hours.map((hour) => (
              <div key={hour} className="flex gap-3 border-t border-line/70">
                <span className="tabular -mt-2.5 w-12 shrink-0 bg-surface text-xs text-muted">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
            {placed.map(({ session, column, columns, start, end }) => {
              const top = (start.getHours() + start.getMinutes() / 60 - firstHour) * HOUR_HEIGHT;
              const height = Math.max(((end.getTime() - start.getTime()) / 3_600_000) * HOUR_HEIGHT - 4, 28);
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelected(session)}
                  className={cn(
                    "absolute overflow-hidden rounded-xl border-l-[3px] bg-surface-2 px-3 py-1.5 text-left text-xs transition hover:brightness-95",
                    session.cancelled_at && "line-through opacity-50",
                  )}
                  style={{
                    top: top + 2,
                    height,
                    left: `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${column / columns})`,
                    width: `calc((100% - ${GUTTER}px) / ${columns} - 4px)`,
                    borderColor: sportMeta(sportOf(session)).color,
                  }}
                >
                  <span className="block truncate font-semibold text-ink">{titleOf(session)}</span>
                  <span className="block truncate text-muted">
                    {format.time(start)} · {detailLine(session)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <SessionDrawer
        orgId={selected?.class_group?.organization_id ?? orgId}
        session={selected}
        onClose={() => setSelected(null)}
        onChanged={(updated) => {
          setSelected((current) => (current?.id === updated.id ? updated : current));
          sessions.setData((sessions.data ?? []).map((item) => (item.id === updated.id ? updated : item)));
        }}
      />
    </div>
  );
}

function SessionChip({ session, title, sport, detail, onClick }: { session: SessionRow; title: string; sport: string | null; detail: string; onClick: () => void }) {
  const { format } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("grid gap-0.5 rounded-xl border-l-[3px] bg-surface-2 px-2.5 py-2 text-left text-xs transition hover:brightness-95", session.cancelled_at && "line-through opacity-50")}
      style={{ borderColor: sportMeta(sport).color }}
    >
      <span className="flex items-center gap-1.5 font-semibold text-ink">
        <SportIcon name={sport} className="h-3.5 w-3.5 shrink-0" />
        <span className="tabular">{format.time(session.starts_at)}</span>
      </span>
      <span className="line-clamp-2 font-medium text-ink">{title}</span>
      {detail ? <span className="truncate text-muted">{detail}</span> : null}
    </button>
  );
}
