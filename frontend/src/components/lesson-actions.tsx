"use client";

import { addDays } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useConfirm, useToast } from "./overlay";
import { hoursUntil, useStudentPortal, type PortalLesson, type PortalSlot } from "./student-portal";

export function useLessonActions() {
  const { t, format } = useI18n();
  const confirm = useConfirm();
  const toast = useToast();
  const portal = useStudentPortal();
  const rules = portal.data?.rules ?? { noticeHours: 6, creditDays: 30, maxCredits: 4 };

  async function run(action: () => Promise<unknown>) {
    try {
      return await action();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
      return null;
    }
  }

  async function cancelLesson(lesson: PortalLesson) {
    if (lesson.kind === "makeup") {
      const ok = await confirm({ title: t.studentArea.unbookTitle, description: t.studentArea.unbookText, confirmLabel: t.studentArea.cancelConfirm, cancelLabel: t.studentArea.keep });
      if (!ok) return;
      if ((await run(() => portal.call(`/makeup/${lesson.id}`, "DELETE"))) !== null) toast({ message: t.studentArea.unbooked });
      return;
    }
    const credited = hoursUntil(lesson.startsAt) >= rules.noticeHours && (portal.data?.credits.balance ?? 0) < rules.maxCredits;
    const ok = await confirm({
      title: t.studentArea.cancelTitle,
      description: credited ? t.studentArea.cancelWithCredit(format.date(addDays(new Date(), rules.creditDays))) : t.studentArea.cancelLate(rules.noticeHours),
      confirmLabel: t.studentArea.cancelConfirm,
      cancelLabel: t.studentArea.keep,
      tone: credited ? "default" : "danger",
    });
    if (!ok) return;
    const result = (await run(() => portal.call(`/lessons/${lesson.id}/cancel`))) as { credited: boolean } | null;
    if (!result) return;
    toast({
      message: result.credited ? t.studentArea.cancelledWithCredit : t.studentArea.cancelledLate,
      action: { label: t.common.undo, onClick: () => void run(() => portal.call(`/lessons/${lesson.id}/restore`)) },
    });
  }

  async function bookSlot(slot: PortalSlot) {
    const ok = await confirm({
      title: t.studentArea.bookTitle,
      description: t.studentArea.bookText(slot.title, slot.teacher, format.date(slot.startsAt), format.time(slot.startsAt)),
      confirmLabel: t.studentArea.bookConfirm,
    });
    if (!ok) return;
    if ((await run(() => portal.call(`/makeup/${slot.id}`))) === null) return;
    toast({ message: t.studentArea.booked, action: { label: t.common.undo, onClick: () => void run(() => portal.call(`/makeup/${slot.id}`, "DELETE")) } });
  }

  return { cancelLesson, bookSlot };
}
