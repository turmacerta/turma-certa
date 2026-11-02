"use client";

import { useI18n } from "@/lib/i18n";
import { SportBadge } from "@/lib/sports";
import type { PortalLesson, PortalSlot } from "./student-portal";
import { Badge, Button, cn } from "./ui";

const STATUS_TONES = {
  attended: "success",
  absent: "danger",
  cancelled_with_credit: "neutral",
  cancelled_late: "warning",
  cancelled_by_school: "danger",
} as const;

export function LessonRow({ lesson, onCancel, action }: { lesson: PortalLesson | PortalSlot; onCancel?: () => void; action?: React.ReactNode }) {
  const { t, format } = useI18n();
  const status = lesson.status !== "booked" && lesson.status !== "open" ? lesson.status : null;
  const cancelled = status === "cancelled_with_credit" || status === "cancelled_late" || status === "cancelled_by_school";
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3", cancelled && "opacity-60")}>
      <div className="w-16 shrink-0 text-center">
        <p className="text-xs font-semibold text-muted">{format.relativeDay(lesson.startsAt)}</p>
        <p className="display tabular text-lg font-semibold">{format.time(lesson.startsAt)}</p>
      </div>
      <SportBadge name={lesson.sport} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{lesson.title}</p>
        <p className="truncate text-xs text-muted">{[lesson.teacher, lesson.space].filter(Boolean).join(" · ")}</p>
      </div>
      {lesson.kind === "makeup" && lesson.status !== "open" ? <Badge tone="primary">{t.studentArea.makeupBadge}</Badge> : null}
      {status ? <Badge tone={STATUS_TONES[status]}>{t.studentArea.status[status]}</Badge> : null}
      {onCancel && lesson.status === "booked" ? (
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t.studentArea.cancel}
        </Button>
      ) : null}
      {action}
    </div>
  );
}
