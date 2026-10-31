"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { AttendanceDrawer } from "@/components/attendance-drawer";
import { FilterChips, Toolbar, ViewSwitcher } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Dialog, useToast } from "@/components/overlay";
import { Badge, Button, cn, EmptyState, ErrorState, IconButton, LoadingList, PageHeader, Select, Stepper } from "@/components/ui";
import { api } from "@/lib/api";
import { classTitle } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { addDays, dateKey, startOfWeek } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { sportMeta, SportIcon } from "@/lib/sports";
import type { ClassRow, SessionRow } from "@/lib/types";
import { useApi, usePersistentState } from "@/lib/use-api";

const MODES = ["week", "list", "day"] as const;
const HOURS = Array.from({ length: 17 }, (_, index) => index + 6);
const HOUR_HEIGHT = 64;

export default function SchedulePage() {
  const { t, format } = useI18n();
  const { orgId, persona } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const [mode, setMode] = usePersistentState("tc-view-schedule", "week", MODES);
  const [anchor, setAnchor] = useState(() => new Date());
  const [teacher, setTeacher] = useState("all");
  const [selected, setSelected] = useState<SessionRow | null>(null);
  const [generating, setGenerating] = useState(false);

  const range = useMemo(() => {
    if (mode === "day") {
      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      return { start, days: 1 };
    }
    return { start: startOfWeek(anchor), days: mode === "list" ? 14 : 7 };
  }, [anchor, mode]);

  const from = range.start.toISOString();
  const to = addDays(range.start, range.days).toISOString();
  const sessions = useApi<SessionRow[]>(`${base}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  const classes = useApi<ClassRow[]>(`${base}/classes`);
  const classById = useMemo(() => new Map((classes.data ?? []).map((item) => [item.id, item])), [classes.data]);

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

  const visible = (sessions.data ?? []).filter((session) => teacher === "all" || session.teacher?.id === teacher);
  const byDay = new Map<string, SessionRow[]>();
  for (const session of visible) {
    const key = dateKey(session.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), session]);
  }

  const days = Array.from({ length: range.days }, (_, index) => addDays(range.start, index));
  const todayKey = dateKey(new Date());
  const step = mode === "day" ? 1 : mode === "list" ? 14 : 7;
  const title = mode === "day" ? format.longDate(range.start) : format.range(range.start, addDays(range.start, range.days - 1));

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader
        eyebrow={t.schedule.eyebrow}
        title={t.schedule.title}
        description={t.schedule.description}
        actions={
          persona === "manager" ? (
            <Button variant="outline" onClick={() => setGenerating(true)}>
              <CalendarPlus className="h-4 w-4" />
              {t.schedule.generate}
            </Button>
          ) : null
        }
      />

      <Toolbar>
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1">
          <IconButton label={t.common.previous} className="h-8 w-8" onClick={() => setAnchor(addDays(anchor, -step))}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <button type="button" onClick={() => setAnchor(new Date())} className="h-8 rounded-full px-3 text-sm font-semibold hover:bg-surface-2">
            {t.common.today}
          </button>
          <IconButton label={t.common.next} className="h-8 w-8" onClick={() => setAnchor(addDays(anchor, step))}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <p className="text-sm font-semibold">{title}</p>
        <div className="ml-auto">
          <ViewSwitcher value={mode} onChange={setMode} modes={MODES} />
        </div>
      </Toolbar>

      {teachers.length > 1 ? (
        <FilterChips
          value={teacher}
          onChange={setTeacher}
          options={[{ value: "all", label: t.schedule.allTeachers }, ...teachers.map(([id, name]) => ({ value: id, label: name.split(" ")[0] ?? name }))]}
        />
      ) : null}

      {sessions.loading ? <LoadingList rows={4} /> : null}
      {sessions.error ? <ErrorState message={sessions.error} onRetry={() => void sessions.reload()} /> : null}

      {!sessions.loading && !sessions.error && visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={t.schedule.emptyTitle}
          description={t.schedule.emptyText}
          action={
            persona === "manager" ? (
              <Button onClick={() => setGenerating(true)}>
                <CalendarPlus className="h-4 w-4" />
                {t.schedule.generate}
              </Button>
            ) : null
          }
        />
      ) : null}

      {!sessions.loading && visible.length > 0 && mode === "week" ? (
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
                      <SessionChip key={session.id} session={session} title={titleOf(session)} sport={sportOf(session)} onClick={() => setSelected(session)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!sessions.loading && visible.length > 0 && mode === "list" ? (
        <div className="grid gap-6">
          {days
            .filter((day) => byDay.has(dateKey(day)))
            .map((day) => {
              const key = dateKey(day);
              return (
                <section key={key} className="grid gap-2">
                  <h3 className={cn("text-sm font-semibold", key === todayKey ? "text-primary" : "text-muted")}>
                    {key === todayKey ? t.schedule.todayPrefix : ""}
                    {format.longDate(day)}
                  </h3>
                  <ul className="grid gap-2">
                    {(byDay.get(key) ?? []).map((session) => (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(session)}
                          className={cn(
                            "flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/40",
                            session.cancelled_at && "opacity-50",
                          )}
                        >
                          <span className="tabular w-28 shrink-0 text-sm font-semibold">
                            {format.time(session.starts_at)}–{format.time(session.ends_at)}
                          </span>
                          <span className="h-8 w-1 rounded-full" style={{ backgroundColor: sportMeta(sportOf(session)).color }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{titleOf(session)}</span>
                            <span className="block truncate text-xs text-muted">
                              {session.teacher?.full_name ?? t.common.noTeacher}
                              {session.space ? ` · ${session.space.name}` : ""}
                            </span>
                          </span>
                          {session.cancelled_at ? <Badge tone="danger">{t.schedule.cancelled}</Badge> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      ) : null}

      {!sessions.loading && visible.length > 0 && mode === "day" ? (
        <div className="rounded-3xl border border-line bg-surface p-4 shadow-soft">
          <div className="relative grid" style={{ gridTemplateRows: `repeat(${HOURS.length}, ${HOUR_HEIGHT}px)` }}>
            {HOURS.map((hour) => (
              <div key={hour} className="flex gap-3 border-t border-line/70">
                <span className="tabular -mt-2.5 w-12 shrink-0 bg-surface text-xs text-muted">{String(hour).padStart(2, "0")}:00</span>
              </div>
            ))}
            {visible.map((session, index) => {
              const start = new Date(session.starts_at);
              const end = new Date(session.ends_at);
              const top = (start.getHours() + start.getMinutes() / 60 - HOURS[0]!) * HOUR_HEIGHT;
              const height = Math.max(((end.getTime() - start.getTime()) / 3_600_000) * HOUR_HEIGHT - 4, 28);
              const overlapping = visible.filter((other) => new Date(other.starts_at) < end && new Date(other.ends_at) > start);
              const column = overlapping.indexOf(session);
              const width = 100 / overlapping.length;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelected(session)}
                  className="absolute overflow-hidden rounded-xl border-l-[3px] bg-surface-2 px-3 py-1.5 text-left text-xs transition hover:brightness-95"
                  style={{
                    top: top + 2,
                    height,
                    left: `calc(64px + (100% - 64px) * ${(column * width) / 100})`,
                    width: `calc((100% - 72px) * ${width / 100})`,
                    borderColor: sportMeta(sportOf(session)).color,
                    zIndex: index,
                  }}
                >
                  <span className="block truncate font-semibold text-ink">{titleOf(session)}</span>
                  <span className="block truncate text-muted">
                    {format.time(session.starts_at)} · {session.space?.name ?? session.teacher?.full_name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <AttendanceDrawer orgId={orgId} session={selected} onClose={() => setSelected(null)} />
      <GenerateDialog open={generating} orgId={orgId} classes={classes.data ?? []} onClose={() => setGenerating(false)} onDone={() => void sessions.reload()} />
    </div>
  );
}

function SessionChip({ session, title, sport, onClick }: { session: SessionRow; title: string; sport: string | null; onClick: () => void }) {
  const { t, format } = useI18n();
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
      <span className="truncate text-muted">{session.teacher?.full_name?.split(" ")[0] ?? t.common.noTeacher}</span>
    </button>
  );
}

function GenerateDialog({ open, orgId, classes, onClose, onDone }: { open: boolean; orgId: string; classes: ClassRow[]; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!classId) return;
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}/schedule/generate`, { method: "POST", body: JSON.stringify({ classGroupId: classId, weeks }) });
      toast({ message: t.schedule.generated(weeks) });
      onDone();
      onClose();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.schedule.generateTitle}
      description={t.schedule.generateText}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button disabled={!classId} loading={saving} onClick={submit}>
            {t.schedule.generateSubmit}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Select
          label={t.schedule.class}
          searchable
          placeholder={t.schedule.pickClass}
          value={classId}
          onChange={setClassId}
          options={classes.map((item) => ({ value: item.id, label: classTitle(item, t), description: item.teacher?.full_name }))}
        />
        <Stepper label={t.schedule.weeks} value={weeks} onChange={setWeeks} min={1} max={12} suffix={t.schedule.weeksSuffix} />
      </div>
    </Dialog>
  );
}
