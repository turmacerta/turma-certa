"use client";

import { useMemo, useState } from "react";
import { BellRing, CalendarPlus, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { autoClassName, classNickname, classTitle, scheduleSummary } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { weekdayLong } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { ClassDetail, ClassFormat, Named, Student, Teacher, Unit } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Dialog, Drawer, useConfirm, useToast } from "./overlay";
import {
  Avatar,
  Badge,
  Button,
  cn,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  InlineAlert,
  LoadingList,
  OccupancyBar,
  Segmented,
  Select,
  Stepper,
  TimeSelect,
} from "./ui";

type ScheduleDraft = { weekday: number; startsAt: string; endsAt: string };

type ClassFormProps = {
  open: boolean;
  orgId: string;
  onClose: () => void;
  onCreated: () => void;
};

export function ClassFormDialog(props: ClassFormProps) {
  return props.open ? <ClassFormDialogBody {...props} /> : null;
}

function ClassFormDialogBody({ open, orgId, onClose, onCreated }: ClassFormProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const base = `/api/v1/organizations/${orgId}`;
  const sports = useApi<Named[]>(`${base}/sports`);
  const teachers = useApi<Teacher[]>(`${base}/teachers`);
  const levels = useApi<Named[]>(`${base}/levels`);
  const units = useApi<Unit[]>(`${base}/units`);
  const [name, setName] = useState("");
  const [pickedSportId, setSportId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [format, setFormat] = useState<ClassFormat>("group");
  const [capacity, setCapacity] = useState(8);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>([{ weekday: 2, startsAt: "18:00", endsAt: "19:00" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sportId = pickedSportId || sports.data?.[0]?.id || "";

  const spaces = useMemo(
    () => (units.data ?? []).flatMap((unit) => unit.spaces.map((space) => ({ ...space, unitId: unit.id, unitName: unit.name }))),
    [units.data],
  );

  const schedulesValid = schedules.length > 0 && schedules.every((item) => item.startsAt < item.endsAt);
  const sportName = sports.data?.find((item) => item.id === sportId)?.name;
  const levelName = levels.data?.find((item) => item.id === levelId)?.name;
  const autoName = autoClassName(t, sportName, levelName, format);
  const valid = Boolean(sportId) && schedulesValid && capacity >= 1;

  function updateSchedule(index: number, patch: Partial<ScheduleDraft>) {
    setSchedules((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    const space = spaces.find((item) => item.id === spaceId);
    try {
      await api(`${base}/classes`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim() || autoName,
          sportId,
          teacherId: teacherId || undefined,
          classLevelId: levelId || undefined,
          spaceId: spaceId || undefined,
          unitId: space?.unitId,
          format,
          maxCapacity: format === "private" ? 1 : capacity,
          schedules,
        }),
      });
      toast({ message: t.classes.form.created(name.trim() || autoName) });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t.classes.form.title}
      description={t.classes.form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="class-form" disabled={!valid} loading={saving}>
            {t.classes.form.submit}
          </Button>
        </>
      }
    >
      <form id="class-form" className="grid gap-5" onSubmit={submit}>
        {sports.data && sports.data.length === 0 ? (
          <InlineAlert tone="warning" title={t.classes.form.missingSportTitle}>
            {t.classes.form.missingSportText}
          </InlineAlert>
        ) : null}
        <Segmented
          label={t.classes.form.format}
          value={format}
          onChange={setFormat}
          options={[
            { value: "group", label: t.classes.form.groupClass },
            { value: "private", label: t.classes.form.privateClass },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t.classes.form.sport}
            value={sportId}
            onChange={setSportId}
            options={(sports.data ?? []).map((sport) => ({ value: sport.id, label: sport.name }))}
          />
          <Select
            label={t.classes.form.level}
            optional
            value={levelId}
            onChange={setLevelId}
            options={[{ value: "", label: t.common.allLevels }, ...(levels.data ?? []).map((level) => ({ value: level.id, label: level.name }))]}
          />
          <Select
            label={t.classes.form.teacher}
            optional
            searchable
            value={teacherId}
            onChange={setTeacherId}
            options={[{ value: "", label: t.common.toBeDefined }, ...(teachers.data ?? []).map((teacher) => ({ value: teacher.id, label: teacher.full_name }))]}
          />
          <Select
            label={t.classes.form.space}
            optional
            value={spaceId}
            onChange={setSpaceId}
            options={[{ value: "", label: t.common.toBeDefined }, ...spaces.map((space) => ({ value: space.id, label: space.name, description: space.unitName }))]}
          />
          {format === "group" ? (
            <Stepper
              label={t.classes.form.capacity}
              value={capacity}
              onChange={setCapacity}
              min={1}
              max={80}
              suffix={t.classes.form.capacitySuffix}
              hint={t.classes.form.capacityHint}
            />
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{t.classes.form.weeklySchedule}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSchedules((items) => [...items, { weekday: 4, startsAt: "18:00", endsAt: "19:00" }])}>
              <Plus className="h-4 w-4" />
              {t.classes.form.addSchedule}
            </Button>
          </div>
          {schedules.map((schedule, index) => (
            <div key={index} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-end gap-2 rounded-2xl border border-line bg-surface-2 p-3">
              <Select
                label={t.classes.form.day}
                value={String(schedule.weekday)}
                onChange={(value) => updateSchedule(index, { weekday: Number(value) })}
                options={Array.from({ length: 7 }, (_, weekday) => ({ value: String(weekday), label: weekdayLong(weekday, locale) }))}
              />
              <TimeSelect label={t.classes.form.start} value={schedule.startsAt} onChange={(value) => updateSchedule(index, { startsAt: value })} />
              <TimeSelect
                label={t.classes.form.end}
                value={schedule.endsAt}
                error={schedule.startsAt >= schedule.endsAt ? t.classes.form.endBeforeStart : null}
                onChange={(value) => updateSchedule(index, { endsAt: value })}
              />
              <IconButton
                label={t.classes.form.removeSchedule}
                disabled={schedules.length === 1}
                onClick={() => setSchedules((items) => items.filter((_, i) => i !== index))}
                className="mb-0.5 text-muted hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          ))}
        </div>
        <Field
          label={t.classes.form.nickname}
          optional
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={autoName}
          hint={t.classes.form.nicknameHint}
        />
        {error ? <InlineAlert tone="danger" title={error} /> : null}
      </form>
    </Dialog>
  );
}

export function ClassDetailDrawer({
  orgId,
  classId,
  onClose,
  onChanged,
  readOnly,
}: {
  orgId: string;
  classId: string | null;
  onClose: () => void;
  onChanged: () => void;
  readOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const base = `/api/v1/organizations/${orgId}`;
  const detail = useApi<ClassDetail>(classId ? `${base}/classes/${classId}` : null);
  const students = useApi<Student[]>(classId && !readOnly ? `${base}/students` : null);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const item = detail.data;
  const enrolled = (item?.enrollments ?? []).filter((enrollment) => enrollment.status === "active");
  const enrolledIds = new Set(enrolled.map((enrollment) => enrollment.student?.id));
  const candidates = (students.data ?? []).filter((student) => !enrolledIds.has(student.id));
  const full = item ? enrolled.length >= item.occupancy.max_capacity : false;
  const nickname = item ? classNickname(item, t) : null;

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  function enroll() {
    if (!studentId || !classId) {
      return;
    }
    void run("enroll", async () => {
      await api(`${base}/classes/${classId}/enrollments`, { method: "POST", body: JSON.stringify({ studentId, status: full ? "waitlist" : "active" }) });
      toast({ message: full ? t.classes.detail.waitlisted : t.classes.detail.enrolled });
      setStudentId("");
      await detail.reload();
      onChanged();
    });
  }

  async function generateSessions() {
    if (!classId) {
      return;
    }
    const ok = await confirm({ title: t.classes.detail.generateTitle, description: t.classes.detail.generateText, confirmLabel: t.classes.detail.generateLessons });
    if (!ok) {
      return;
    }
    await run("generate", async () => {
      await api(`${base}/schedule/generate`, { method: "POST", body: JSON.stringify({ classGroupId: classId, weeks: 4 }) });
      toast({ message: t.classes.detail.generated });
    });
  }

  async function notify() {
    if (!classId) {
      return;
    }
    const ok = await confirm({ title: t.classes.detail.notifyTitle, description: t.classes.detail.notifyText, confirmLabel: t.classes.detail.notifyConfirm });
    if (!ok) {
      return;
    }
    await run("notify", async () => {
      const result = await api<{ notified: unknown[]; skipped?: string }>(`${base}/classes/${classId}/notify`, { method: "POST" });
      toast({
        message: result.skipped ? t.errors.classFull : result.notified.length ? t.classes.detail.notified(result.notified.length) : t.classes.detail.nobodyToNotify,
        tone: result.notified.length ? "success" : "info",
      });
    });
  }

  return (
    <Drawer
      open={Boolean(classId)}
      onClose={onClose}
      title={item ? classTitle(item, t) : t.classes.title}
      subtitle={
        item ? (
          <span className="flex flex-wrap items-center gap-2">
            <span>{scheduleSummary(item.class_schedules, locale, t.common.noSchedule)}</span>
            {nickname ? <Badge tone="neutral">{nickname}</Badge> : null}
          </span>
        ) : null
      }
      footer={
        readOnly ? null : (
          <>
            <Button variant="outline" onClick={notify} loading={busy === "notify"} disabled={full}>
              <BellRing className="h-4 w-4" />
              {t.classes.detail.notifyVacancy}
            </Button>
            <Button onClick={generateSessions} loading={busy === "generate"}>
              <CalendarPlus className="h-4 w-4" />
              {t.classes.detail.generateLessons}
            </Button>
          </>
        )
      }
    >
      {detail.loading ? <LoadingList rows={3} /> : null}
      {detail.error ? <ErrorState message={detail.error} onRetry={() => void detail.reload()} /> : null}
      {item ? (
        <div className="grid gap-6">
          <section className="grid gap-3 rounded-3xl border border-line bg-surface-2 p-4">
            <OccupancyBar enrolled={enrolled.length} capacity={item.occupancy.max_capacity} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted">{t.classes.detail.teacher}</dt>
                <dd className="font-semibold">{item.teacher?.full_name ?? t.common.toBeDefined}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t.classes.detail.schedule}</dt>
                <dd className="font-semibold">{scheduleSummary(item.class_schedules, locale, t.common.noSchedule)}</dd>
              </div>
            </dl>
          </section>

          {readOnly ? null : (
            <section className="grid gap-3">
              <h3 className="font-semibold">{t.classes.detail.enrollTitle}</h3>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label={t.classes.detail.student}
                    searchable
                    placeholder={t.classes.detail.pickStudent}
                    value={studentId}
                    onChange={setStudentId}
                    options={candidates.map((student) => ({ value: student.id, label: student.full_name, description: student.class_level?.name }))}
                  />
                </div>
                <Button onClick={enroll} disabled={!studentId} loading={busy === "enroll"}>
                  <UserPlus className="h-4 w-4" />
                  {full ? t.classes.detail.waitlist : t.classes.detail.enroll}
                </Button>
              </div>
              {full ? <p className="text-xs font-medium text-warning">{t.classes.detail.fullHint}</p> : null}
            </section>
          )}

          <section className="grid gap-3">
            <h3 className="font-semibold">
              {t.classes.detail.studentsTitle} <span className="text-muted">({enrolled.length})</span>
            </h3>
            {enrolled.length === 0 ? (
              <EmptyState title={t.classes.detail.emptyTitle} description={t.classes.detail.emptyText} />
            ) : (
              <ul className="grid gap-2">
                {enrolled.map((enrollment) => {
                  const levelMismatch = item.class_level && enrollment.student?.class_level_id && enrollment.student.class_level_id !== item.class_level.id;
                  return (
                    <li key={enrollment.id} className="flex items-center gap-3 rounded-2xl border border-line px-3 py-2.5">
                      <Avatar name={enrollment.student?.full_name ?? "?"} size="sm" />
                      <span className="flex-1 truncate text-sm font-medium">{enrollment.student?.full_name}</span>
                      {levelMismatch ? <Badge tone="warning">{t.classes.detail.levelMismatch}</Badge> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}

export function ClassTile({
  name,
  subtitle,
  enrolled,
  capacity,
  onClick,
  className,
}: {
  name: string;
  subtitle: string;
  enrolled: number;
  capacity: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "grid gap-2 rounded-2xl border border-line bg-surface p-3 text-left transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        className,
      )}
    >
      <span className="truncate text-sm font-semibold">{name}</span>
      <span className="truncate text-xs text-muted">{subtitle}</span>
      <OccupancyBar enrolled={enrolled} capacity={capacity} compact />
      <span className="tabular text-xs text-muted">
        {enrolled}/{capacity}
      </span>
    </button>
  );
}
