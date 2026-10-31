"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { addDays } from "@/lib/format";

export const NOTICE_HOURS = 6;
export const CREDIT_DAYS = 30;

export type PreviewLesson = {
  id: string;
  teacher: string;
  space: string;
  startsAt: string;
  endsAt: string;
  kind: "regular" | "makeup";
  status: "booked" | "cancelled_with_credit" | "cancelled_late" | "attended" | "absent";
};

export type PreviewSlot = {
  id: string;
  teacher: string;
  space: string;
  startsAt: string;
  endsAt: string;
  vacancies: number;
};

export type PreviewCredit = { id: string; expiresAt: string; usedOn?: string };

export const PREVIEW_SPORT = "tennis";
export const PREVIEW_PLAN = { priceCents: 48000, lessonsPerCycle: 8 };

function at(days: number, hour: number) {
  const date = addDays(new Date(), days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

function nextWeekday(weekday: number, hour: number, weeks = 0) {
  const delta = (weekday - new Date().getDay() + 7) % 7 || 7;
  return at(delta + weeks * 7, hour);
}

function byStart<T extends { startsAt: string }>(items: T[]) {
  return [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function initialLessons(): PreviewLesson[] {
  const base = { teacher: "Marina Costa", space: "Quadra 1 · Saibro", kind: "regular" as const };
  return byStart<PreviewLesson>([
    { ...base, id: "l-past-2", startsAt: at(-5, 18), endsAt: at(-5, 19), status: "attended" },
    { ...base, id: "l-past-1", startsAt: at(-3, 18), endsAt: at(-3, 19), status: "absent" },
    { ...base, id: "l-1", startsAt: at(0, 21), endsAt: at(0, 22), status: "booked" },
    { ...base, id: "l-2", startsAt: nextWeekday(2, 18), endsAt: nextWeekday(2, 19), status: "booked" },
    { ...base, id: "l-3", startsAt: nextWeekday(4, 18), endsAt: nextWeekday(4, 19), status: "booked" },
    { ...base, id: "l-4", startsAt: nextWeekday(2, 18, 1), endsAt: nextWeekday(2, 19, 1), status: "booked" },
    { ...base, id: "l-5", startsAt: nextWeekday(4, 18, 1), endsAt: nextWeekday(4, 19, 1), status: "booked" },
  ]);
}

function initialSlots(): PreviewSlot[] {
  return byStart<PreviewSlot>([
    { id: "s-1", teacher: "Camila Rocha", space: "Quadra 2 · Saibro", startsAt: nextWeekday(6, 9), endsAt: nextWeekday(6, 10), vacancies: 3 },
    { id: "s-2", teacher: "Marina Costa", space: "Quadra Rápida", startsAt: nextWeekday(3, 19), endsAt: nextWeekday(3, 20), vacancies: 1 },
    { id: "s-3", teacher: "Camila Rocha", space: "Quadra 2 · Saibro", startsAt: nextWeekday(6, 9, 1), endsAt: nextWeekday(6, 10, 1), vacancies: 2 },
    { id: "s-4", teacher: "Marina Costa", space: "Quadra 1 · Saibro", startsAt: nextWeekday(1, 7), endsAt: nextWeekday(1, 8), vacancies: 0 },
  ]);
}

type PreviewState = {
  lessons: PreviewLesson[];
  slots: PreviewSlot[];
  credits: PreviewCredit[];
  alertOn: boolean;
  planEndsAt: string;
  cancel: (lessonId: string) => void;
  undoCancel: (lessonId: string) => void;
  book: (slotId: string) => string | null;
  undoBook: (lessonId: string) => void;
  toggleAlert: () => void;
};

const PreviewContext = createContext<PreviewState | null>(null);

export function hoursUntil(iso: string) {
  return (new Date(iso).getTime() - Date.now()) / 3_600_000;
}

export function StudentPreviewProvider({ children }: { children: React.ReactNode }) {
  const [lessons, setLessons] = useState(initialLessons);
  const [slots, setSlots] = useState(initialSlots);
  const [credits, setCredits] = useState<PreviewCredit[]>(() => [{ id: "c-1", expiresAt: addDays(new Date(), 12).toISOString() }]);
  const [alertOn, setAlertOn] = useState(false);
  const [planEndsAt] = useState(() => addDays(new Date(), 5).toISOString());

  const cancel = useCallback(
    (lessonId: string) => {
      const lesson = lessons.find((item) => item.id === lessonId);
      const credited = lesson ? hoursUntil(lesson.startsAt) >= NOTICE_HOURS : false;
      setLessons((items) => items.map((item) => (item.id === lessonId ? { ...item, status: credited ? "cancelled_with_credit" : "cancelled_late" } : item)));
      if (credited) {
        setCredits((items) => [...items, { id: `c-${lessonId}`, expiresAt: addDays(new Date(), CREDIT_DAYS).toISOString() }]);
      }
    },
    [lessons],
  );

  const undoCancel = useCallback((lessonId: string) => {
    setLessons((items) => items.map((item) => (item.id === lessonId ? { ...item, status: "booked" } : item)));
    setCredits((items) => items.filter((item) => item.id !== `c-${lessonId}`));
  }, []);

  const book = useCallback(
    (slotId: string) => {
      const slot = slots.find((item) => item.id === slotId);
      const credit = credits.find((item) => !item.usedOn);
      if (!slot || !credit || slot.vacancies <= 0) {
        return null;
      }
      const lessonId = `m-${slotId}`;
      setCredits((items) => items.map((item) => (item.id === credit.id ? { ...item, usedOn: lessonId } : item)));
      setSlots((items) => items.map((item) => (item.id === slotId ? { ...item, vacancies: item.vacancies - 1 } : item)));
      setLessons((items) =>
        byStart([
          ...items,
          { id: lessonId, teacher: slot.teacher, space: slot.space, startsAt: slot.startsAt, endsAt: slot.endsAt, kind: "makeup" as const, status: "booked" as const },
        ]),
      );
      return lessonId;
    },
    [slots, credits],
  );

  const undoBook = useCallback((lessonId: string) => {
    const slotId = lessonId.replace(/^m-/, "");
    setLessons((items) => items.filter((item) => item.id !== lessonId));
    setSlots((items) => items.map((item) => (item.id === slotId ? { ...item, vacancies: item.vacancies + 1 } : item)));
    setCredits((items) => items.map((item) => (item.usedOn === lessonId ? { ...item, usedOn: undefined } : item)));
  }, []);

  const value = useMemo(
    () => ({ lessons, slots, credits, alertOn, planEndsAt, cancel, undoCancel, book, undoBook, toggleAlert: () => setAlertOn((current) => !current) }),
    [lessons, slots, credits, alertOn, planEndsAt, cancel, undoCancel, book, undoBook],
  );

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function useStudentPreview() {
  const value = useContext(PreviewContext);
  if (!value) {
    throw new Error("useStudentPreview must be used inside StudentPreviewProvider");
  }
  return value;
}
