"use client";

import { useMemo, useState } from "react";
import { CircleDollarSign, Plus, Receipt, RefreshCcw, WalletCards } from "lucide-react";
import { BoardColumn, DataTable, SearchInput, Toolbar, ViewSwitcher } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Dialog, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, LoadingList, PageHeader, Segmented, Select, StatCard, Stepper, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { readQueryParam } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { daysUntil, normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { BillingPlan, BillingSummary, ClassFormat, Invoice, Student } from "@/lib/types";
import { useApi, usePersistentState } from "@/lib/use-api";

type Tab = "renewals" | "invoices" | "plans";
const INVOICE_MODES = ["list", "board"] as const;
const INVOICE_TONES: Record<Invoice["status"], "success" | "warning" | "danger" | "neutral"> = {
  paid: "success",
  pending: "warning",
  overdue: "danger",
  draft: "neutral",
  cancelled: "neutral",
};

type Subscription = {
  id: string;
  status: string;
  current_period_end: string;
  student?: { id: string; full_name: string } | null;
  billing_plan?: { id: string; name: string; price_cents: number } | null;
};

function initialTab(): Tab {
  const tab = readQueryParam("tab");
  return tab === "invoices" || tab === "plans" ? tab : "renewals";
}

export default function BillingPage() {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { orgId } = useOrg();
  const base = `/api/v1/organizations/${orgId}/billing`;
  const summary = useApi<BillingSummary>(base);
  const plans = useApi<BillingPlan[]>(`${base}/plans`);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [invoiceMode, setInvoiceMode] = usePersistentState("tc-view-invoices", "list", INVOICE_MODES);
  const [query, setQuery] = useState("");
  const [creatingPlan, setCreatingPlan] = useState(() => readQueryParam("new") === "plan");
  const [subscribing, setSubscribing] = useState(() => readQueryParam("new") === "subscription");

  const subscriptions = useMemo(() => (summary.data?.subscriptions ?? []) as Subscription[], [summary.data]);
  const upcoming = useMemo(
    () =>
      subscriptions
        .filter((item) => item.status !== "cancelled" && daysUntil(item.current_period_end) <= 14)
        .sort((a, b) => a.current_period_end.localeCompare(b.current_period_end)),
    [subscriptions],
  );
  const invoices = (summary.data?.invoices ?? []).filter((invoice) => !query || normalize(invoice.student?.full_name ?? "").includes(normalize(query)));
  const overdue = (summary.data?.invoices ?? []).filter((invoice) => invoice.status === "overdue");
  const mrr = subscriptions.filter((item) => item.status === "active" || item.status === "past_due").reduce((sum, item) => sum + (item.billing_plan?.price_cents ?? 0), 0);

  async function renew(item: Subscription) {
    const ok = await confirm({
      title: t.billing.renewTitle,
      description: t.billing.renewText(item.student?.full_name ?? t.billing.theStudent, item.billing_plan?.name ?? t.billing.thePlan, format.currency(item.billing_plan?.price_cents ?? 0)),
      confirmLabel: t.common.renew,
    });
    if (!ok) return;
    try {
      await api(`${base}/subscriptions/${item.id}/renew`, { method: "POST" });
      toast({ message: t.billing.renewed });
      await summary.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader
        eyebrow={t.billing.eyebrow}
        title={t.billing.title}
        description={t.billing.description}
        actions={
          <>
            <Button variant="outline" onClick={() => setCreatingPlan(true)}>
              <Plus className="h-4 w-4" />
              {t.billing.newPlan}
            </Button>
            <Button onClick={() => setSubscribing(true)}>
              <WalletCards className="h-4 w-4" />
              {t.billing.subscribe}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.billing.mrr} value={format.currency(mrr)} hint={t.billing.mrrHint} tone="primary" icon={<CircleDollarSign className="h-5 w-5" />} />
        <StatCard label={t.billing.open} value={format.currency(summary.data?.openAmountCents ?? 0)} hint={t.billing.openHint} />
        <StatCard
          label={t.billing.overdue}
          value={format.currency(overdue.reduce((sum, item) => sum + item.amount_cents, 0))}
          hint={t.common.invoices(overdue.length)}
          tone={overdue.length ? "danger" : "neutral"}
        />
        <StatCard label={t.billing.renewals} value={summary.data?.renewalsDue.length ?? 0} hint={t.billing.renewalsHint} tone="warning" />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "renewals", label: t.billing.tabs.renewals, count: upcoming.length },
          { value: "invoices", label: t.billing.tabs.invoices, count: summary.data?.invoices.length },
          { value: "plans", label: t.billing.tabs.plans, count: plans.data?.length },
        ]}
      />

      {summary.loading ? <LoadingList rows={4} /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={() => void summary.reload()} /> : null}

      {!summary.loading && !summary.error && tab === "renewals" ? (
        upcoming.length === 0 ? (
          <EmptyState icon={<RefreshCcw />} title={t.billing.nothingExpiringTitle} description={t.billing.nothingExpiringText} />
        ) : (
          <DataTable
            columns={[
              { label: t.billing.columns.student },
              { label: t.billing.columns.plan },
              { label: t.billing.columns.expires },
              { label: t.billing.columns.amount },
              { label: "", className: "w-32" },
            ]}
          >
            {upcoming.map((item) => {
              const days = daysUntil(item.current_period_end);
              const relative = format.relativeDay(item.current_period_end);
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={item.student?.full_name ?? "?"} size="sm" />
                      <span className="font-semibold">{item.student?.full_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{item.billing_plan?.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={days < 0 ? "danger" : days <= 3 ? "warning" : "neutral"}>{days < 0 ? t.billing.expiredAgo(relative) : relative}</Badge>
                  </td>
                  <td className="tabular px-4 py-3">{format.currency(item.billing_plan?.price_cents ?? 0)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => void renew(item)}>
                      <RefreshCcw className="h-3.5 w-3.5" />
                      {t.common.renew}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )
      ) : null}

      {!summary.loading && !summary.error && tab === "invoices" ? (
        <div className="grid gap-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder={t.billing.searchStudent} className="min-w-56 flex-1 sm:max-w-xs" />
            <div className="ml-auto">
              <ViewSwitcher value={invoiceMode} onChange={setInvoiceMode} modes={INVOICE_MODES} />
            </div>
          </Toolbar>
          {invoices.length === 0 ? (
            <EmptyState icon={<Receipt />} title={t.billing.noInvoicesTitle} description={t.billing.noInvoicesText} />
          ) : invoiceMode === "list" ? (
            <DataTable
              columns={[
                { label: t.billing.columns.student },
                { label: t.billing.columns.due },
                { label: t.billing.columns.status },
                { label: t.billing.columns.amount },
                { label: "", className: "w-36" },
              ]}
            >
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-semibold">{invoice.student?.full_name ?? t.billing.student}</td>
                  <td className="px-4 py-3 text-muted">{format.date(invoice.due_date)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={INVOICE_TONES[invoice.status]}>{t.billing.status[invoice.status]}</Badge>
                  </td>
                  <td className="tabular px-4 py-3 font-semibold">{format.currency(invoice.amount_cents)}</td>
                  <td className="px-4 py-3 text-right">
                    {invoice.status === "pending" || invoice.status === "overdue" ? (
                      <Button size="sm" variant="ghost" onClick={() => toast({ message: t.billing.payOffMissing(invoice.student?.full_name ?? t.billing.student), tone: "info" })}>
                        {t.billing.payOff}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </DataTable>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {(["overdue", "pending", "paid"] as const).map((status) => {
                const items = invoices.filter((invoice) => invoice.status === status);
                return (
                  <BoardColumn key={status} title={t.billing.status[status]} count={items.length} tone={INVOICE_TONES[status] === "neutral" ? "neutral" : INVOICE_TONES[status]}>
                    {items.slice(0, 40).map((invoice) => (
                      <div key={invoice.id} className="grid gap-1 rounded-2xl border border-line bg-surface p-3">
                        <span className="truncate text-sm font-semibold">{invoice.student?.full_name ?? t.billing.student}</span>
                        <span className="flex items-center justify-between text-xs text-muted">
                          <span>{t.billing.dueOn(format.date(invoice.due_date))}</span>
                          <span className="tabular font-semibold text-ink">{format.currency(invoice.amount_cents)}</span>
                        </span>
                      </div>
                    ))}
                  </BoardColumn>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {!summary.loading && tab === "plans" ? (
        plans.data && plans.data.length === 0 ? (
          <EmptyState
            icon={<WalletCards />}
            title={t.billing.noPlansTitle}
            description={t.billing.noPlansText}
            action={
              <Button onClick={() => setCreatingPlan(true)}>
                <Plus className="h-4 w-4" />
                {t.billing.createPlan}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(plans.data ?? []).map((plan) => {
              const count = subscriptions.filter((item) => item.billing_plan?.id === plan.id && item.status !== "cancelled").length;
              return (
                <Card key={plan.id} className="grid gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={plan.format === "private" ? "accent" : "primary"}>{plan.format === "private" ? t.common.private : t.common.group}</Badge>
                    <span className="text-xs text-muted">{t.common.students(count)}</span>
                  </div>
                  <p className="display text-lg font-semibold">{plan.name}</p>
                  <p>
                    <span className="display tabular text-3xl font-semibold">{format.currency(plan.price_cents)}</span>
                    <span className="text-sm text-muted">{t.billing.perDays(plan.cycle_days)}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {plan.lessons_per_cycle ? t.billing.lessonsInCycle(plan.lessons_per_cycle) : t.billing.freeLessons}
                    {plan.lessons_per_cycle ? ` · ${t.billing.perLesson(format.currency(Math.round(plan.price_cents / plan.lessons_per_cycle)))}` : ""}
                  </p>
                </Card>
              );
            })}
          </div>
        )
      ) : null}

      <PlanDialog open={creatingPlan} orgId={orgId} onClose={() => setCreatingPlan(false)} onCreated={() => void plans.reload()} />
      <SubscribeDialog open={subscribing} orgId={orgId} plans={plans.data ?? []} onClose={() => setSubscribing(false)} onCreated={() => void summary.reload()} />
    </div>
  );
}

type DialogProps = { open: boolean; orgId: string; onClose: () => void; onCreated: () => void };

function PlanDialog(props: DialogProps) {
  return props.open ? <PlanDialogBody {...props} /> : null;
}

function PlanDialogBody({ open, orgId, onClose, onCreated }: DialogProps) {
  const { t, format } = useI18n();
  const toast = useToast();
  const [name, setName] = useState("");
  const [planFormat, setPlanFormat] = useState<ClassFormat>("group");
  const [price, setPrice] = useState("");
  const [lessons, setLessons] = useState(8);
  const [cycle, setCycle] = useState("30");
  const [saving, setSaving] = useState(false);
  const form = t.billing.planForm;

  const cents = Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
  const valid = name.trim().length >= 2 && Number.isFinite(cents) && cents > 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}/billing/plans`, {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), format: planFormat, cycleDays: Number(cycle), lessonsPerCycle: lessons, priceCents: cents }),
      });
      toast({ message: form.created(name.trim()) });
      onCreated();
      onClose();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={form.title}
      description={form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="plan-form" disabled={!valid} loading={saving}>
            {form.submit}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} className="grid gap-4">
        <Segmented
          label={form.type}
          value={planFormat}
          onChange={setPlanFormat}
          options={[
            { value: "group", label: t.common.group },
            { value: "private", label: t.common.private },
          ]}
        />
        <Field label={form.name} value={name} onChange={(event) => setName(event.target.value)} placeholder={form.namePlaceholder} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={form.price} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ""))} placeholder={form.pricePlaceholder} />
          <Select label={form.cycle} value={cycle} onChange={setCycle} options={Object.entries(form.cycles).map(([value, label]) => ({ value, label }))} />
          <Stepper label={form.lessons} value={lessons} onChange={setLessons} min={1} max={40} />
        </div>
        {valid && lessons ? <p className="text-sm text-muted">{form.perLessonHint(format.currency(Math.round(cents / lessons)))}</p> : null}
      </form>
    </Dialog>
  );
}

function SubscribeDialog(props: DialogProps & { plans: BillingPlan[] }) {
  return props.open ? <SubscribeDialogBody {...props} /> : null;
}

function SubscribeDialogBody({ open, orgId, plans, onClose, onCreated }: DialogProps & { plans: BillingPlan[] }) {
  const { t, format } = useI18n();
  const toast = useToast();
  const students = useApi<Student[]>(`/api/v1/organizations/${orgId}/students`);
  const [studentId, setStudentId] = useState("");
  const [planId, setPlanId] = useState("");
  const [saving, setSaving] = useState(false);
  const form = t.billing.subscribeForm;
  const plan = plans.find((item) => item.id === planId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId || !planId || saving) return;
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}/billing/subscriptions`, { method: "POST", body: JSON.stringify({ studentId, billingPlanId: planId, autoRenew: true }) });
      toast({ message: form.done });
      onCreated();
      onClose();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={form.title}
      description={form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="subscribe-form" disabled={!studentId || !planId} loading={saving}>
            {form.submit}
          </Button>
        </>
      }
    >
      <form id="subscribe-form" onSubmit={submit} className="grid gap-4">
        <Select
          label={form.student}
          searchable
          placeholder={form.pickStudent}
          value={studentId}
          onChange={setStudentId}
          options={(students.data ?? []).map((student) => ({ value: student.id, label: student.full_name, description: student.class_level?.name }))}
        />
        <Select
          label={form.plan}
          placeholder={form.pickPlan}
          value={planId}
          onChange={setPlanId}
          options={plans.map((item) => ({ value: item.id, label: item.name, description: format.currency(item.price_cents) }))}
        />
        {plan ? (
          <div className="rounded-2xl bg-surface-2 p-4 text-sm">
            <p className="font-semibold">{form.summary(format.currency(plan.price_cents), plan.cycle_days)}</p>
            <p className="text-muted">{plan.lessons_per_cycle ? form.credits(plan.lessons_per_cycle) : form.unlimited}</p>
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
