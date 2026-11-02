"use client";

import { useConfirm, useToast } from "@/components/overlay";
import { useStudentPortal } from "@/components/student-portal";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { daysUntil } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Invoice } from "@/lib/types";

const INVOICE_TONES: Record<string, "success" | "warning" | "danger" | "neutral"> = { paid: "success", pending: "warning", overdue: "danger" };

export default function StudentPlanPage() {
  const { t, format } = useI18n();
  const portal = useStudentPortal();
  const confirm = useConfirm();
  const toast = useToast();
  const data = portal.data;
  if (!data) return null;
  const subscription = data.subscription;
  const plan = subscription?.billing_plan;

  if (!subscription || !plan) {
    return (
      <div className="grid grid-cols-1 gap-6 animate-fade-up">
        <PageHeader title={t.studentArea.planTitle} />
        <EmptyState title={t.studentArea.noPlan} description={t.studentArea.noPlanText} />
      </div>
    );
  }

  const days = daysUntil(subscription.current_period_end);
  const price = format.currency(plan.price_cents);
  const cycleStart = new Date(subscription.current_period_end);
  cycleStart.setDate(cycleStart.getDate() - 30);
  const used = data.lessons.filter((lesson) => (lesson.status === "attended" || lesson.status === "absent") && new Date(lesson.startsAt) >= cycleStart).length;

  async function requestRenewal() {
    const ok = await confirm({ title: t.studentArea.requestTitle, description: t.studentArea.requestText(plan!.name, price), confirmLabel: t.studentArea.requestRenewal });
    if (!ok) return;
    try {
      await portal.call("/renewal");
      toast({ message: t.studentArea.requested });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  const metrics = [
    { label: t.studentArea.cycleLessons, value: plan.lessons_per_cycle ?? "∞" },
    { label: t.studentArea.used, value: used },
    { label: t.studentArea.makeups, value: data.credits.balance },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.studentArea.planTitle} />
      <Card className="grid gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="display text-2xl font-semibold">{plan.name}</p>
            <p className="tabular text-muted">
              {price} {t.studentArea.perMonth}
            </p>
          </div>
          <Badge tone={days <= 7 ? "warning" : "success"}>{days <= 7 ? t.studentArea.expiresIn(Math.max(days, 0)) : t.studentArea.active}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl bg-surface-2 p-3">
              <p className="display tabular text-xl font-semibold">{metric.value}</p>
              <p className="text-[11px] text-muted">{metric.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">{t.studentArea.renewsOn(format.date(subscription.current_period_end))}</p>
        <div>
          <Button onClick={() => void requestRenewal()}>{t.studentArea.requestRenewal}</Button>
        </div>
      </Card>
      {data.invoices.length ? (
        <section className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted">{t.studentArea.invoices}</h2>
          {data.invoices.map((invoice) => (
            <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 text-sm">
              <span>{format.date(invoice.due_date)}</span>
              <span className="tabular font-semibold">{format.currency(invoice.amount_cents)}</span>
              <Badge tone={INVOICE_TONES[invoice.status] ?? "neutral"}>{t.billing.status[invoice.status as Invoice["status"]] ?? invoice.status}</Badge>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
