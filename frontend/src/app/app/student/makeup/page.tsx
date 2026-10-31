"use client";

import { BellRing, CalendarSync } from "lucide-react";
import { useLessonActions } from "@/components/lesson-actions";
import { LessonRow } from "@/components/lesson-row";
import { useStudentPreview } from "@/components/student-preview";
import { Badge, Button, Card, EmptyState, PageHeader, Switch } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function StudentMakeupPage() {
  const { t, format } = useI18n();
  const { slots, credits, alertOn, toggleAlert } = useStudentPreview();
  const { bookSlot } = useLessonActions();
  const available = credits.filter((credit) => !credit.usedOn);

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader title={t.studentArea.makeupTitle} description={t.studentArea.makeupDescription} />

      <Card className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted">{t.studentArea.availableCredits}</p>
          <p className="display tabular text-3xl font-semibold">{available.length}</p>
        </div>
        <div className="grid gap-1 text-right text-xs text-muted">
          {available.map((credit) => (
            <span key={credit.id}>{t.studentArea.creditLine(t.studentArea.sampleCreditReason, format.date(credit.expiresAt))}</span>
          ))}
        </div>
      </Card>

      {available.length === 0 ? (
        <EmptyState icon={<CalendarSync />} title={t.studentArea.noCreditsTitle} description={t.studentArea.noCreditsText} />
      ) : (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.studentArea.openSlots}</h2>
          {slots.map((slot) => (
            <LessonRow
              key={slot.id}
              lesson={slot}
              action={
                slot.vacancies > 0 ? (
                  <>
                    <Badge tone="neutral">{t.studentArea.vacancies(slot.vacancies)}</Badge>
                    <Button size="sm" onClick={() => void bookSlot(slot)}>
                      {t.studentArea.book}
                    </Button>
                  </>
                ) : (
                  <Badge tone="neutral">{t.studentArea.full}</Badge>
                )
              }
            />
          ))}
        </section>
      )}

      <Card className="flex items-center gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2">
          <BellRing className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <Switch checked={alertOn} onChange={toggleAlert} label={t.studentArea.alertTitle} description={t.studentArea.alertText} />
        </div>
      </Card>
    </div>
  );
}
