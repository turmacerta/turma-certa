"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarPlus, Pencil, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { autoClassName, classNickname, classTitle, scheduleSummary } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { weekdayLong } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { activePackage } from "@/lib/plans";
import { SportBadge } from "@/lib/sports";
import type { ClassDetail, ClassFormat, Level, Named, Student, Teacher, Unit } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { useOrg } from "./org-provider";
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
  editing?: ClassDetail | null;
};

export function ClassFormDialog(props: ClassFormProps) {
  return props.open ? <ClassFormDialogBody {...props} /> : null;
}

const hhmm = (value: string) => value.slice(0, 5);

function ClassFormDialogBody({ open, orgId, onClose, onCreated, editing }: ClassFormProps) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { saasPlan, can } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const school = saasPlan === "school" && can("classes.manage");
  const sports = useApi<Named[]>(`${base}/sports`);
  const teachers = useApi<Teacher[]>(school ? `${base}/teachers` : null);
  const levels = useApi<Level[]>(`${base}/levels`);
  const units = useApi<Unit[]>(`${base}/units`);
  const [name, setName] = useState(() => (editing ? (classNickname(editing, t) ?? "") : ""));
  const [pickedSportId, setSportId] = useState(editing?.sport?.id ?? "");
  const [teacherId, setTeacherId] = useState(editing?.teacher?.id ?? "");
  const [levelId, setLevelId] = useState(editing?.class_level?.id ?? "");
  const [spaceId, setSpaceId] = useState(editing?.space?.id ?? "");
  const [format, setFormat] = useState<ClassFormat>(editing?.format ?? "group");
  const [capacity, setCapacity] = useState(editing?.occupancy?.max_capacity ?? editing?.max_capacity ?? 8);
  const [schedules, setSchedules] = useState<ScheduleDraft[]>(() =>
    editing?.class_schedules.length
      ? editing.class_schedules.map((item) => ({ weekday: item.weekday, startsAt: hhmm(item.starts_at), endsAt: hhmm(item.ends_at) }))
      : [{ weekday: 2, startsAt: "18:00", endsAt: "19:00" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sportId = pickedSportId || sports.data?.[0]?.id || "";
  const sportLevels = (levels.data ?? []).filter((level) => !level.sport_id || level.sport_id === sportId);
  const linkedTeachers = (teachers.data ?? []).filter((teacher) => teacher.teacher_sports?.some((link) => link.sport?.id === sportId));
  const sportTeachers = linkedTeachers.length > 0 ? linkedTeachers : (teachers.data ?? []);

  function pickSport(id: string) {
    setSportId(id);
    setLevelId("");
    setTeacherId("");
  }

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
      if (editing) {
        await api(`${base}/classes/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim() || autoName,
            sportId,
            teacherId: teacherId || null,
            classLevelId: levelId || null,
            spaceId: spaceId || null,
            unitId: space?.unitId,
            maxCapacity: format === "private" ? 1 : capacity,
            schedules,
          }),
        });
        toast({ message: t.classes.form.saved });
      } else {
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
      }
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
      title={editing ? t.classes.form.editTitle : t.classes.form.title}
      description={editing ? t.classes.form.editDescription : t.classes.form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="class-form" disabled={!valid} loading={saving}>
            {editing ? t.classes.form.save : t.classes.form.submit}
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
        {editing ? null : (
        <Segmented
          label={t.classes.form.format}
          value={format}
          onChange={setFormat}
          options={[
            { value: "group", label: t.classes.form.groupClass },
            { value: "private", label: t.classes.form.privateClass },
          ]}
        />
        )}
        <div className="grid gap-2">
          <p className="text-sm font-semibold">{t.classes.form.sport}</p>
          <div role="radiogroup" aria-label={t.classes.form.sport} className="flex flex-wrap gap-2">
            {(sports.data ?? []).map((sport) => (
              <button
                key={sport.id}
                type="button"
                role="radio"
                aria-checked={sport.id === sportId}
                onClick={() => pickSport(sport.id)}
                className={cn(
                  "flex items-center gap-2 rounded-2xl border py-1.5 pl-1.5 pr-3 text-sm font-semibold transition",
                  sport.id === sportId ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40",
                )}
              >
                <SportBadge name={sport.name} size="sm" />
                {sport.name}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-semibold">{t.classes.form.level}</p>
          {sportLevels.length === 0 ? (
            <p className="text-sm text-muted">{t.classes.form.noLevelsForSport}</p>
          ) : (
            <div role="radiogroup" aria-label={t.classes.form.level} className="flex flex-wrap gap-2">
              {[{ id: "", name: t.common.allLevels }, ...sportLevels].map((level) => (
                <button
                  key={level.id || "all"}
                  type="button"
                  role="radio"
                  aria-checked={level.id === levelId}
                  onClick={() => setLevelId(level.id)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-semibold transition",
                    level.id === levelId ? "border-primary bg-primary-soft" : "border-line text-muted hover:text-ink",
                  )}
                >
                  {level.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          {school ? (
            <Select
              label={t.classes.form.teacher}
              optional
              searchable
              hint={t.classes.form.teacherHint}
              value={teacherId}
              onChange={setTeacherId}
              options={[{ value: "", label: t.common.toBeDefined }, ...sportTeachers.map((teacher) => ({ value: teacher.id, label: teacher.full_name }))]}
            />
          ) : null}
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
  const { saasPlan, can } = useOrg();
  const router = useRouter();
  const school = saasPlan === "school";
  const teachers = useApi<Teacher[]>(classId && !readOnly && school ? `${base}/teachers` : null);
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editingOpen, setEditingOpen] = useState(false);

  const item = detail.data;
  const enrolled = (item?.enrollments ?? []).filter((enrollment) => enrollment.status === "active");
  const enrolledIds = new Set(enrolled.map((enrollment) => enrollment.student?.id));
  const candidates = (students.data ?? []).filter((student) => !enrolledIds.has(student.id));
  const full = item ? enrolled.length >= (item.occupancy?.max_capacity ?? item.max_capacity ?? 0) : false;
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

  const pickedStudent = candidates.find((student) => student.id === studentId);
  const needsPackage = Boolean(pickedStudent && !activePackage(pickedStudent.subscriptions));

  function enroll() {
    if (!studentId || !classId) {
      return;
    }
    if (needsPackage) {
      router.push(`${ROUTES.billing}?new=subscription&student=${studentId}&class=${classId}`);
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

  function changeTeacher(teacherId: string) {
    if (!classId) return;
    void run("teacher", async () => {
      await api(`${base}/classes/${classId}`, { method: "PATCH", body: JSON.stringify({ teacherId: teacherId || null }) });
      toast({ message: t.classes.detail.teacherChanged });
      await detail.reload();
      onChanged();
    });
  }

  async function unenroll(id: string, name: string) {
    const ok = await confirm({ title: t.classes.detail.unenrollTitle, description: t.classes.detail.unenrollText(name), confirmLabel: t.classes.detail.unenroll, tone: "danger" });
    if (!ok || !classId) return;
    await run(`unenroll:${id}`, async () => {
      await api(`${base}/classes/${classId}/enrollments/${id}`, { method: "DELETE" });
      toast({ message: t.classes.detail.unenrolled(name) });
      await detail.reload();
      onChanged();
    });
  }

  async function archive() {
    if (!classId || !item) return;
    const ok = await confirm({ title: t.classes.detail.removeTitle, description: t.classes.detail.removeText, confirmLabel: t.classes.detail.remove, tone: "danger" });
    if (!ok) return;
    await run("archive", async () => {
      await api(`${base}/classes/${classId}`, { method: "DELETE" });
      toast({ message: t.classes.detail.removed });
      onChanged();
      onClose();
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
            <OccupancyBar enrolled={enrolled.length} capacity={item.occupancy?.max_capacity ?? item.max_capacity ?? 0} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {readOnly || !school ? (
                <div>
                  <dt className="text-xs text-muted">{t.classes.detail.teacher}</dt>
                  <dd className="font-semibold">{item.teacher?.full_name ?? t.common.toBeDefined}</dd>
                </div>
              ) : (
                <div className="col-span-2 sm:col-span-1">
                  <Select
                    label={t.classes.detail.teacher}
                    value={item.teacher?.id ?? ""}
                    onChange={changeTeacher}
                    disabled={busy === "teacher"}
                    placeholder={t.common.toBeDefined}
                    options={[
                      { value: "", label: t.common.toBeDefined },
                      ...(teachers.data ?? [])
                        .filter((teacher) => teacher.id === item.teacher?.id || !item.sport || teacher.teacher_sports?.some((link) => link.sport?.id === item.sport?.id))
                        .map((teacher) => ({ value: teacher.id, label: teacher.full_name })),
                    ]}
                  />
                </div>
              )}
              <div>
                <dt className="text-xs text-muted">{t.classes.detail.schedule}</dt>
                <dd className="font-semibold">{scheduleSummary(item.class_schedules, locale, t.common.noSchedule)}</dd>
              </div>
            </dl>
            {readOnly ? null : (
              <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-3">
                <Button size="sm" variant="quiet-danger" onClick={() => void archive()} loading={busy === "archive"}>
                  <Trash2 className="h-4 w-4" />
                  {t.classes.detail.remove}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  {t.classes.detail.edit}
                </Button>
              </div>
            )}
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
                    options={candidates.map((student) => ({
                      value: student.id,
                      label: student.full_name,
                      description: [student.class_level?.name, activePackage(student.subscriptions) ? null : t.classes.detail.noPackage].filter(Boolean).join(" · ") || undefined,
                    }))}
                  />
                </div>
                <Button onClick={enroll} disabled={!studentId} loading={busy === "enroll"}>
                  <UserPlus className="h-4 w-4" />
                  {needsPackage ? t.classes.detail.sellAndEnroll : full ? t.classes.detail.waitlist : t.classes.detail.enroll}
                </Button>
              </div>
              {needsPackage ? <p className="text-xs font-medium text-warning">{t.classes.detail.needsPackageHint}</p> : full ? <p className="text-xs font-medium text-warning">{t.classes.detail.fullHint}</p> : null}
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
                      {!readOnly && enrollment.student && !activePackage(enrollment.student.subscriptions) ? (
                        can("billing.manage") ? (
                          <button
                            type="button"
                            onClick={() => router.push(`${ROUTES.billing}?new=subscription&student=${enrollment.student!.id}`)}
                            aria-label={t.classes.detail.sellPackageTo(enrollment.student.full_name)}
                            className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning transition hover:brightness-95"
                          >
                            {t.classes.detail.noPackage}
                          </button>
                        ) : (
                          <Badge tone="warning">{t.classes.detail.noPackage}</Badge>
                        )
                      ) : null}
                      {readOnly || !enrollment.student ? null : (
                        <IconButton
                          label={t.classes.detail.unenrollOf(enrollment.student.full_name)}
                          onClick={() => void unenroll(enrollment.student!.id, enrollment.student!.full_name)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      ) : null}
      <ClassFormDialog
        open={editingOpen && Boolean(item)}
        orgId={orgId}
        editing={item}
        onClose={() => setEditingOpen(false)}
        onCreated={() => {
          void detail.reload();
          onChanged();
        }}
      />
    </Drawer>
  );
}

