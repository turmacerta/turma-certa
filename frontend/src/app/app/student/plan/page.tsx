"use client";

import { useConfirm, useToast } from "@/components/overlay";
import { PREVIEW_PLAN, useStudentPreview } from "@/components/student-preview";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { daysUntil } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function StudentPlanPage() {
  const { t, format } = useI18n();
  const { planEndsAt, lessons, credits } = useStudentPreview();
  const confirm = useConfirm();
  const toast = useToast();
  const days = daysUntil(planEndsAt);
  const used = lessons.filter((lesson) => lesson.status === "attended" || lesson.status === "absent").length;
  const price = format.currency(PREVIEW_PLAN.priceCents);

  async function requestRenewal() {
    const ok = await confirm({ title: t.studentArea.requestTitle, description: t.studentArea.requestText(t.studentArea.samplePlan, price), confirmLabel: t.studentArea.requestRenewal });
    if (ok) {
      toast({ message: t.studentArea.requested });
    }
  }

  const metrics = [
    { label: t.studentArea.cycleLessons, value: PREVIEW_PLAN.lessonsPerCycle },
    { label: t.studentArea.used, value: used },
    { label: t.studentArea.makeups, value: credits.filter((credit) => !credit.usedOn).length },
  ];

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader title={t.studentArea.planTitle} />
      <Card className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="display text-2xl font-semibold">{t.studentArea.samplePlan}</p>
            <p className="tabular text-muted">
              {price} {t.studentArea.perMonth}
            </p>
          </div>
          <Badge tone={days <= 7 ? "warning" : "success"}>{days <= 7 ? t.studentArea.expiresIn(days) : t.studentArea.active}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-surface-2 p-3">
              <p className="display tabular text-xl font-semibold">{metric.value}</p>
              <p className="text-[11px] text-muted">{metric.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">{t.studentArea.renewsOn(format.date(planEndsAt))}</p>
        <div>
          <Button onClick={requestRenewal}>{t.studentArea.requestRenewal}</Button>
        </div>
      </Card>
    </div>
  );
}
