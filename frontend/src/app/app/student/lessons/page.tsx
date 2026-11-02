"use client";

import { useState } from "react";
import { Pagination, usePaged } from "@/components/data-view";
import { useLessonActions } from "@/components/lesson-actions";
import { LessonRow } from "@/components/lesson-row";
import { useStudentPortal } from "@/components/student-portal";
import { EmptyState, PageHeader, Tabs } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function StudentLessonsPage() {
  const { t } = useI18n();
  const { data } = useStudentPortal();
  const { cancelLesson } = useLessonActions();
  const [tab, setTab] = useState<"next" | "history">("next");
  const lessons = data?.lessons ?? [];
  const now = new Date();
  const upcoming = lessons.filter((lesson) => new Date(lesson.endsAt) > now);
  const history = lessons.filter((lesson) => new Date(lesson.endsAt) <= now).reverse();
  const paged = usePaged(tab === "next" ? upcoming : history, tab);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.studentArea.lessonsTitle} description={t.studentArea.lessonsDescription} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "next", label: t.studentArea.tabs.next, count: upcoming.length },
          { value: "history", label: t.studentArea.tabs.history, count: history.length },
        ]}
      />
      {paged.total === 0 ? (
        <EmptyState title={t.studentArea.nothingTitle} description={t.studentArea.nothingText} />
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {paged.items.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} onCancel={tab === "next" ? () => void cancelLesson(lesson) : undefined} />
          ))}
        </div>
      )}
      <Pagination {...paged} />
    </div>
  );
}
