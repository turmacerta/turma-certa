"use client";

import { useState } from "react";
import { BellRing, CalendarSync } from "lucide-react";
import { Pagination, usePaged } from "@/components/data-view";
import { useLessonActions } from "@/components/lesson-actions";
import { LessonRow } from "@/components/lesson-row";
import { useToast } from "@/components/overlay";
import { useStudentPortal } from "@/components/student-portal";
import { Badge, Button, Card, EmptyState, PageHeader, Switch } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";

export default function StudentMakeupPage() {
  const { t, format } = useI18n();
  const toast = useToast();
  const portal = useStudentPortal();
  const { bookSlot } = useLessonActions();
  const [saving, setSaving] = useState(false);
  const data = portal.data;
  const paged = usePaged(data?.slots ?? []);
  if (!data) return null;

  async function toggleAlert(on: boolean) {
    setSaving(true);
    try {
      await portal.call("/alert", "PUT", { on });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.studentArea.makeupTitle} description={t.studentArea.makeupDescription} />

      <Card className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted">{t.studentArea.availableCredits}</p>
          <p className="display tabular text-3xl font-semibold">{data.credits.balance}</p>
        </div>
        {data.credits.nextExpiry ? <p className="text-xs text-muted">{t.studentArea.nextExpiry(format.date(data.credits.nextExpiry))}</p> : null}
      </Card>

      {data.credits.balance === 0 ? (
        <EmptyState icon={<CalendarSync />} title={t.studentArea.noCreditsTitle} description={t.studentArea.noCreditsText} />
      ) : paged.total === 0 ? (
        <EmptyState icon={<CalendarSync />} title={t.studentArea.noSlotsTitle} description={t.studentArea.noSlotsText} />
      ) : (
        <section className="grid grid-cols-1 gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.studentArea.openSlots}</h2>
          {paged.items.map((slot) => (
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
          <Pagination {...paged} />
        </section>
      )}

      <Card className="flex items-center gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2">
          <BellRing className="h-5 w-5" />
        </span>
        <div className={saving ? "flex-1 opacity-60" : "flex-1"}>
          <Switch checked={data.alertOn} onChange={(on) => void toggleAlert(on)} label={t.studentArea.alertTitle} description={t.studentArea.alertText} />
        </div>
      </Card>
    </div>
  );
}
