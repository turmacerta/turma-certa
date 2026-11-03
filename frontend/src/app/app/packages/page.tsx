"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Archive, Package, Pencil, Plus, Receipt, RotateCcw } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { useConfirm, useToast } from "@/components/overlay";
import { PackageDialog } from "@/components/package-forms";
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, LoadingList, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useClearQuery, useQueryParam } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import type { BillingPlan, BillingSummary } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export default function PackagesPage() {
  const { t, format } = useI18n();
  const { orgId, can } = useOrg();
  const toast = useToast();
  const confirm = useConfirm();
  const base = `/api/v1/organizations/${orgId}/billing`;
  const plans = useApi<BillingPlan[]>(`${base}/plans`);
  const summary = useApi<BillingSummary>(base);
  const canManage = can("billing.manage");
  const copy = t.packages;
  const newParam = useQueryParam("new");
  const clearQuery = useClearQuery();
  const [creating, setCreating] = useState(() => Boolean(newParam));
  const [editing, setEditing] = useState<BillingPlan | null>(null);

  const active = (plans.data ?? []).filter((plan) => plan.is_active !== false);
  const archived = (plans.data ?? []).filter((plan) => plan.is_active === false);
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of (summary.data?.subscriptions ?? []) as Array<{ status?: string; billing_plan?: { id: string } | null }>) {
      if (item.status === "cancelled" || !item.billing_plan) continue;
      map.set(item.billing_plan.id, (map.get(item.billing_plan.id) ?? 0) + 1);
    }
    return map;
  }, [summary.data]);

  async function setActive(plan: BillingPlan, isActive: boolean) {
    if (!isActive) {
      const ok = await confirm({ title: copy.archiveTitle, description: copy.archiveText(plan.name), confirmLabel: copy.archive });
      if (!ok) return;
    }
    try {
      await api(`${base}/plans/${plan.id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });
      toast({ message: isActive ? copy.restored(plan.name) : copy.archived(plan.name) });
      await plans.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  const cycleLabel = (days: number) => t.billing.planForm.cycles[String(days)] ?? t.billing.planForm.everyDays(days);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader
        title={copy.title}
        description={plans.data ? copy.description(active.length) : undefined}
        actions={
          canManage ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.billing.newPlan}
            </Button>
          ) : null
        }
      />

      {plans.loading ? <LoadingList rows={3} /> : null}
      {plans.error ? <ErrorState message={plans.error} onRetry={() => void plans.reload()} /> : null}

      {plans.data && active.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title={t.billing.noPlansTitle}
          description={t.billing.noPlansText}
          action={
            canManage ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.billing.createPlan}
              </Button>
            ) : null
          }
        />
      ) : null}

      {active.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((plan) => (
            <Card key={plan.id} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={plan.format === "private" ? "accent" : "primary"}>{plan.format === "private" ? t.common.private : t.common.group}</Badge>
                <span className="text-xs text-muted">{t.common.students(usage.get(plan.id) ?? 0)}</span>
              </div>
              <p className="display text-lg font-semibold">{plan.name}</p>
              <p>
                <span className="display tabular text-3xl font-semibold">{format.currency(plan.price_cents)}</span>
                <span className="text-sm text-muted"> · {cycleLabel(plan.cycle_days)}</span>
              </p>
              <p className="text-sm text-muted">
                {plan.weekly_classes ? t.billing.subscribeForm.weekly(plan.weekly_classes) : t.billing.subscribeForm.flexible}
                {" · "}
                {plan.lessons_per_cycle ? t.billing.lessonsInCycle(plan.lessons_per_cycle) : t.billing.freeLessons}
                {plan.lessons_per_cycle ? ` · ${t.billing.perLesson(format.currency(Math.round(plan.price_cents / plan.lessons_per_cycle)))}` : ""}
              </p>
              {canManage ? (
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <Link
                    href={`${ROUTES.billing}?new=subscription&plan=${plan.id}`}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
                  >
                    <Receipt className="h-4 w-4" />
                    {copy.sell}
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setEditing(plan)}>
                    <Pencil className="h-4 w-4" />
                    {copy.edit}
                  </Button>
                  <IconButton label={copy.archiveOf(plan.name)} className="ml-auto" onClick={() => void setActive(plan, false)}>
                    <Archive className="h-4 w-4" />
                  </IconButton>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : null}

      {archived.length ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted">{copy.archivedTitle(archived.length)}</h2>
          <ul className="grid gap-2">
            {archived.map((plan) => (
              <li key={plan.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{plan.name}</span>
                  <span className="text-xs text-muted">
                    {format.currency(plan.price_cents)} · {cycleLabel(plan.cycle_days)}
                  </span>
                </span>
                {canManage ? (
                  <Button size="sm" variant="ghost" onClick={() => void setActive(plan, true)}>
                    <RotateCcw className="h-4 w-4" />
                    {copy.restore}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <PackageDialog open={creating} orgId={orgId} onClose={() => (newParam ? clearQuery() : setCreating(false))} onSaved={() => void plans.reload()} />
      <PackageDialog open={Boolean(editing)} orgId={orgId} editing={editing} onClose={() => setEditing(null)} onSaved={() => void plans.reload()} />
    </div>
  );
}
