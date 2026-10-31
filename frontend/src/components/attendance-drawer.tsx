"use client";

import { useState } from "react";
import { CalendarSync, Check, UserX } from "lucide-react";
import { api } from "@/lib/api";
import { classTitle } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { ClassDetail, SessionRow } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Drawer, useToast } from "./overlay";
import { Avatar, Badge, Button, cn, EmptyState, ErrorState, LoadingList } from "./ui";

type Mark = "present" | "absent" | "makeup";

const MARKS: Array<{ value: Mark; icon: typeof Check; tone: string; badge: "success" | "danger" | "primary" }> = [
  { value: "present", icon: Check, tone: "bg-success text-white", badge: "success" },
  { value: "absent", icon: UserX, tone: "bg-danger text-white", badge: "danger" },
  { value: "makeup", icon: CalendarSync, tone: "bg-primary text-on-primary", badge: "primary" },
];

export function AttendanceDrawer({ orgId, session, onClose }: { orgId: string; session: SessionRow | null; onClose: () => void }) {
  const { t, format } = useI18n();
  const toast = useToast();
  const classId = session?.class_group?.id;
  const detail = useApi<ClassDetail>(session && classId ? `/api/v1/organizations/${orgId}/classes/${classId}` : null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const students = (detail.data?.enrollments ?? []).filter((item) => item.status === "active" && item.student).map((item) => item.student!);
  const labels: Record<Mark, string> = { present: t.attendance.present, absent: t.attendance.absent, makeup: t.attendance.makeup };

  async function mark(studentId: string, status: Mark) {
    if (!session) {
      return;
    }
    const previous = marks[studentId];
    setMarks((value) => ({ ...value, [studentId]: status }));
    setSaving(studentId);
    try {
      await api(`/api/v1/organizations/${orgId}/schedule/sessions/${session.id}/attendance`, {
        method: "POST",
        body: JSON.stringify({ studentId, status }),
      });
    } catch (err) {
      setMarks((value) => {
        const next = { ...value };
        if (previous) {
          next[studentId] = previous;
        } else {
          delete next[studentId];
        }
        return next;
      });
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(null);
    }
  }

  async function markAllPresent() {
    for (const student of students.filter((item) => !marks[item.id])) {
      await mark(student.id, "present");
    }
    toast({ message: t.attendance.finished });
  }

  const done = students.filter((item) => marks[item.id]).length;

  return (
    <Drawer
      open={Boolean(session)}
      onClose={onClose}
      title={detail.data ? classTitle(detail.data, t) : (session?.class_group?.name ?? t.attendance.title)}
      subtitle={
        session ? (
          <span>
            {format.longDate(session.starts_at)} · {format.time(session.starts_at)}–{format.time(session.ends_at)}
            {session.space ? ` · ${session.space.name}` : ""}
          </span>
        ) : null
      }
      footer={
        students.length ? (
          <>
            <span className="mr-auto self-center text-sm text-muted">{t.attendance.marked(done, students.length)}</span>
            <Button variant="outline" onClick={markAllPresent} disabled={done === students.length}>
              {t.attendance.allPresent}
            </Button>
            <Button onClick={onClose}>{t.common.done}</Button>
          </>
        ) : null
      }
    >
      {detail.loading ? <LoadingList rows={4} /> : null}
      {detail.error ? <ErrorState message={detail.error} onRetry={() => void detail.reload()} /> : null}
      {!detail.loading && !detail.error && students.length === 0 ? <EmptyState title={t.attendance.emptyTitle} description={t.attendance.emptyText} /> : null}
      <ul className="grid gap-2">
        {students.map((student) => {
          const current = marks[student.id];
          const meta = MARKS.find((item) => item.value === current);
          return (
            <li key={student.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
              <Avatar name={student.full_name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{student.full_name}</span>
                {meta ? <Badge tone={meta.badge}>{labels[meta.value]}</Badge> : <span className="text-xs text-muted">{t.attendance.unmarked}</span>}
              </span>
              <div className="flex gap-1.5" role="group" aria-label={t.attendance.attendanceOf(student.full_name)}>
                {MARKS.map((option) => {
                  const active = current === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      aria-label={labels[option.value]}
                      disabled={saving === student.id}
                      onClick={() => void mark(student.id, option.value)}
                      className={cn(
                        "grid h-10 w-10 place-items-center rounded-full border transition",
                        active ? `${option.tone} border-transparent` : "border-line bg-surface text-muted hover:text-ink",
                      )}
                    >
                      <option.icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
      {students.length ? <p className="mt-4 text-xs text-muted">{t.attendance.note}</p> : null}
    </Drawer>
  );
}
