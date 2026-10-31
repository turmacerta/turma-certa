"use client";

import { addDays } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useConfirm, useToast } from "./overlay";
import { CREDIT_DAYS, hoursUntil, NOTICE_HOURS, PREVIEW_SPORT, useStudentPreview, type PreviewLesson, type PreviewSlot } from "./student-preview";

export function usePreviewLabels() {
  const { t } = useI18n();
  return { sport: t.sports[PREVIEW_SPORT], level: t.studentArea.sampleLevel, title: `${t.sports[PREVIEW_SPORT]} · ${t.studentArea.sampleLevel}` };
}

export function useLessonActions() {
  const { t, format } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const preview = useStudentPreview();
  const labels = usePreviewLabels();

  async function cancelLesson(lesson: PreviewLesson) {
    const credited = hoursUntil(lesson.startsAt) >= NOTICE_HOURS;
    const ok = await confirm({
      title: t.studentArea.cancelTitle,
      description: credited ? t.studentArea.cancelWithCredit(format.date(addDays(new Date(), CREDIT_DAYS))) : t.studentArea.cancelLate(NOTICE_HOURS),
      confirmLabel: t.studentArea.cancelConfirm,
      cancelLabel: t.studentArea.keep,
      tone: credited ? "default" : "danger",
    });
    if (!ok) return;
    preview.cancel(lesson.id);
    toast({
      message: credited ? t.studentArea.cancelledWithCredit : t.studentArea.cancelledLate,
      action: { label: t.common.undo, onClick: () => preview.undoCancel(lesson.id) },
    });
  }

  async function bookSlot(slot: PreviewSlot) {
    const ok = await confirm({
      title: t.studentArea.bookTitle,
      description: t.studentArea.bookText(labels.title, slot.teacher, format.date(slot.startsAt), format.time(slot.startsAt)),
      confirmLabel: t.studentArea.bookConfirm,
    });
    if (!ok) return;
    const lessonId = preview.book(slot.id);
    if (!lessonId) {
      toast({ message: t.studentArea.slotTaken, tone: "error" });
      return;
    }
    toast({ message: t.studentArea.booked, action: { label: t.common.undo, onClick: () => preview.undoBook(lessonId) } });
  }

  return { cancelLesson, bookSlot };
}
