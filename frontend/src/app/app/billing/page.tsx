"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, CircleCheck, CircleDollarSign, Receipt, RefreshCcw, Send } from "lucide-react";
import { DataTable, FilterChips, Pagination, SearchInput, Toolbar, usePaged } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Dialog, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, cn, EmptyState, ErrorState, InlineAlert, LoadingList, MockBadge, PageHeader, Select, StatCard, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { useClearQuery, useQueryParam } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { classOption } from "@/lib/classes";
import { daysUntil, normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { activePackage } from "@/lib/plans";
import type { BillingPlan, BillingSummary, ClassRow, Invoice, Student } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Tab = "overdue" | "renewals" | "invoices";
type InvoiceFilter = "all" | "overdue" | "pending" | "paid";
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

type Debtor = { id: string; name: string; total: number; oldest: string; invoices: Invoice[] };

function asTab(tab: string | null): Tab | null {
  return tab === "overdue" || tab === "renewals" || tab === "invoices" ? tab : null;
}

export default function BillingPage() {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { orgId, can } = useOrg();
  const canManage = can("billing.manage");
  const base = `/api/v1/organizations/${orgId}/billing`;
  const summary = useApi<BillingSummary>(base);
  const plans = useApi<BillingPlan[]>(`${base}/plans`);
  const tabParam = useQueryParam("tab");
  const newParam = useQueryParam("new");
  const clearQuery = useClearQuery();
  const [pickedTab, setTab] = useState<Tab | null>(() => asTab(tabParam));
  const [query, setQuery] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("all");
  const [sending, setSending] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(() => newParam === "subscription");

  const subscriptions = useMemo(() => (summary.data?.subscriptions ?? []) as Subscription[], [summary.data]);
  const upcoming = useMemo(
    () =>
      subscriptions
        .filter((item) => item.status !== "cancelled" && daysUntil(item.current_period_end) <= 14)
        .sort((a, b) => a.current_period_end.localeCompare(b.current_period_end)),
    [subscriptions],
  );
  const allInvoices = useMemo(() => summary.data?.invoices ?? [], [summary.data]);
  const matchesQuery = (name: string) => !query || normalize(name).includes(normalize(query));
  const debtors = useMemo(() => {
    const map = new Map<string, Debtor>();
    for (const invoice of allInvoices) {
      if (invoice.status !== "overdue" || !invoice.student?.id) continue;
      const entry = map.get(invoice.student.id) ?? { id: invoice.student.id, name: invoice.student.full_name, total: 0, oldest: invoice.due_date, invoices: [] };
      entry.total += invoice.amount_cents;
      entry.invoices.push(invoice);
      if (invoice.due_date < entry.oldest) entry.oldest = invoice.due_date;
      map.set(entry.id, entry);
    }
    return [...map.values()].sort((a, b) => a.oldest.localeCompare(b.oldest));
  }, [allInvoices]);
  const overdueTotal = debtors.reduce((sum, item) => sum + item.total, 0);
  const tab: Tab = pickedTab ?? (debtors.length ? "overdue" : "renewals");
  const mrr = subscriptions.filter((item) => item.status === "active" || item.status === "past_due").reduce((sum, item) => sum + (item.billing_plan?.price_cents ?? 0), 0);

  const visibleDebtors = debtors.filter((item) => matchesQuery(item.name));
  const visibleInvoices = allInvoices.filter(
    (invoice) => (invoiceFilter === "all" || invoice.status === invoiceFilter) && matchesQuery(invoice.student?.full_name ?? ""),
  );
  const debtorPage = usePaged(visibleDebtors, query);
  const renewalPage = usePaged(upcoming);
  const invoicePage = usePaged(visibleInvoices, `${query}|${invoiceFilter}`);

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

  async function remind(studentIds?: string[]) {
    setSending(studentIds?.[0] ?? "all");
    try {
      const result = await api<{ recipients: number }>(`${base}/reminders`, { method: "POST", body: JSON.stringify(studentIds ? { studentIds } : {}) });
      toast({ message: t.billing.remindersSent(result.recipients) });
      await summary.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSending(null);
    }
  }

  async function payOff(invoices: Invoice[], name: string) {
    const total = invoices.reduce((sum, item) => sum + item.amount_cents, 0);
    const ok = await confirm({
      title: t.billing.payOffTitle,
      description: t.billing.payOffText(name, format.currency(total)),
      confirmLabel: t.billing.payOff,
    });
    if (!ok) return;
    try {
      for (const invoice of invoices) {
        await api(`${base}/invoices/${invoice.id}/pay`, { method: "POST" });
      }
      toast({ message: t.billing.paidOff(name) });
      await summary.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader
        title={t.billing.title}
        description={t.billing.description}
        actions={
          canManage ? (
            <Button onClick={() => setSubscribing(true)}>
              <Receipt className="h-4 w-4" />
              {t.billing.subscribe}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t.billing.mrr} value={format.currency(mrr)} hint={t.billing.mrrHint} tone="primary" icon={<CircleDollarSign className="h-5 w-5" />} />
        <StatCard
          label={t.billing.overdue}
          value={format.currency(overdueTotal)}
          hint={t.billing.debtorsCount(debtors.length)}
          tone={debtors.length ? "danger" : "neutral"}
          onClick={() => setTab("overdue")}
        />
        <StatCard label={t.billing.renewals} value={summary.data?.renewalsDue.length ?? 0} hint={t.billing.renewalsHint} tone="warning" onClick={() => setTab("renewals")} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overdue", label: t.billing.tabs.overdue, count: debtors.length },
          { value: "renewals", label: t.billing.tabs.renewals, count: upcoming.length },
          { value: "invoices", label: t.billing.tabs.invoices },
        ]}
      />

      {summary.loading ? <LoadingList rows={4} /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={() => void summary.reload()} /> : null}

      {!summary.loading && !summary.error && tab === "overdue" ? (
        debtors.length === 0 ? (
          <EmptyState icon={<CircleCheck />} title={t.billing.noDebtorsTitle} description={t.billing.noDebtorsText} />
        ) : (
          <div className="grid gap-4">
            <Toolbar>
              <SearchInput value={query} onChange={setQuery} placeholder={t.billing.searchStudent} className="min-w-56 flex-1 sm:max-w-xs" />
              {canManage ? (
                <div className="ml-auto flex items-center gap-2">
                  <MockBadge />
                  <Button onClick={() => void remind()} loading={sending === "all"} disabled={sending !== null}>
                    <Send className="h-4 w-4" />
                    {t.billing.remindAll(debtors.length)}
                  </Button>
                </div>
              ) : null}
            </Toolbar>
            <ul className="grid grid-cols-1 gap-2">
              {debtorPage.items.map((debtor) => {
                const last = summary.data?.lastReminders?.[debtor.id];
                return (
                  <li key={debtor.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-soft">
                    <Avatar name={debtor.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{debtor.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {t.billing.lateSince(format.date(debtor.oldest), debtor.invoices.length)} ·{" "}
                        {last ? t.billing.lastReminder(format.relativeDay(last.slice(0, 10))) : t.billing.neverReminded}
                      </span>
                    </span>
                    <span className="tabular font-semibold text-danger">{format.currency(debtor.total)}</span>
                    {canManage ? (
                      <span className="flex gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => void remind([debtor.id])} loading={sending === debtor.id} disabled={sending !== null}>
                          <Send className="h-3.5 w-3.5" />
                          {t.billing.remind}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void payOff(debtor.invoices, debtor.name)}>
                          {t.billing.received}
                        </Button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <Pagination {...debtorPage} />
          </div>
        )
      ) : null}

      {!summary.loading && !summary.error && tab === "renewals" ? (
        upcoming.length === 0 ? (
          <EmptyState icon={<RefreshCcw />} title={t.billing.nothingExpiringTitle} description={t.billing.nothingExpiringText} />
        ) : (
          <div className="grid gap-4">
            <DataTable
              columns={[
                { label: t.billing.columns.student },
                { label: t.billing.columns.plan },
                { label: t.billing.columns.expires },
                { label: t.billing.columns.amount },
                { label: "", className: "w-32" },
              ]}
            >
              {renewalPage.items.map((item) => {
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
                      {canManage ? (
                        <Button size="sm" variant="secondary" onClick={() => void renew(item)}>
                          <RefreshCcw className="h-3.5 w-3.5" />
                          {t.common.renew}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </DataTable>
            <Pagination {...renewalPage} />
          </div>
        )
      ) : null}

      {!summary.loading && !summary.error && tab === "invoices" ? (
        <div className="grid gap-4">
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder={t.billing.searchStudent} className="min-w-56 flex-1 sm:max-w-xs" />
            <FilterChips
              value={invoiceFilter}
              onChange={setInvoiceFilter}
              options={(["all", "overdue", "pending", "paid"] as const).map((value) => ({
                value,
                label: value === "all" ? t.common.all : t.billing.status[value],
                count: value === "all" ? allInvoices.length : allInvoices.filter((invoice) => invoice.status === value).length,
              }))}
            />
          </Toolbar>
          {visibleInvoices.length === 0 ? (
            <EmptyState icon={<Receipt />} title={t.billing.noInvoicesTitle} description={t.billing.noInvoicesText} />
          ) : (
            <>
              <DataTable
                columns={[
                  { label: t.billing.columns.student },
                  { label: t.billing.columns.due },
                  { label: t.billing.columns.status },
                  { label: t.billing.columns.amount },
                  { label: "", className: "w-36" },
                ]}
              >
                {invoicePage.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-semibold">{invoice.student?.full_name ?? t.billing.student}</td>
                    <td className="px-4 py-3 text-muted">{format.date(invoice.due_date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={INVOICE_TONES[invoice.status]}>{t.billing.status[invoice.status]}</Badge>
                    </td>
                    <td className="tabular px-4 py-3 font-semibold">{format.currency(invoice.amount_cents)}</td>
                    <td className="px-4 py-3 text-right">
                      {canManage && (invoice.status === "pending" || invoice.status === "overdue") ? (
                        <Button size="sm" variant="ghost" onClick={() => void payOff([invoice], invoice.student?.full_name ?? t.billing.student)}>
                          {t.billing.payOff}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </DataTable>
              <Pagination {...invoicePage} />
            </>
          )}
        </div>
      ) : null}

      <SubscribeDialog open={subscribing} orgId={orgId} plans={(plans.data ?? []).filter((plan) => plan.is_active !== false)} onClose={() => (newParam ? clearQuery() : setSubscribing(false))} onCreated={() => void summary.reload()} />
    </div>
  );
}

type DialogProps = { open: boolean; orgId: string; onClose: () => void; onCreated: () => void };

function SubscribeDialog(props: DialogProps & { plans: BillingPlan[] }) {
  return props.open ? <SubscribeDialogBody {...props} /> : null;
}

function SubscribeDialogBody({ open, orgId, plans, onClose, onCreated }: DialogProps & { plans: BillingPlan[] }) {
  const { t, format, locale } = useI18n();
  const toast = useToast();
  const students = useApi<Student[]>(`/api/v1/organizations/${orgId}/students`);
  const classes = useApi<ClassRow[]>(`/api/v1/organizations/${orgId}/classes`);
  const studentParam = useQueryParam("student");
  const planParam = useQueryParam("plan");
  const [studentId, setStudentId] = useState(() => studentParam ?? "");
  const classParam = useQueryParam("class");
  const [classIds, setClassIds] = useState<string[]>(() => (classParam ? [classParam] : []));
  const studentDetail = useApi<Student>(studentId ? `/api/v1/organizations/${orgId}/students/${studentId}` : null);
  const [planId, setPlanId] = useState(() => planParam ?? (plans.length === 1 ? plans[0].id : ""));
  const [saving, setSaving] = useState(false);
  const form = t.billing.subscribeForm;
  const cycles = t.billing.planForm.cycles;
  const plan = plans.find((item) => item.id === planId);
  const current = studentDetail.data?.id === studentId ? activePackage(studentDetail.data.subscriptions) : null;
  const inClasses = new Set((studentDetail.data?.id === studentId ? (studentDetail.data.enrollments ?? []) : []).filter((item) => item.status === "active" || item.status === "waitlist").map((item) => item.class_group?.id));
  const classChoices = (classes.data ?? []).filter((item) => item.is_active !== false && !inClasses.has(item.id) && (!plan || (item.format === plan.format && (!plan.sport_id || item.sport?.id === plan.sport_id))));
  const picked = classIds.filter((id) => classChoices.some((item) => item.id === id));
  const needed = plan?.weekly_classes ?? 0;
  const classesReady = !needed || picked.length === needed;
  const toggleClass = (id: string) => setClassIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : needed && current.length >= needed ? [...current.slice(1), id] : [...current, id]));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId || !planId || !classesReady || saving) return;
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}/billing/subscriptions`, { method: "POST", body: JSON.stringify({ studentId, billingPlanId: planId, autoRenew: true, classIds: picked }) });
      toast({ message: picked.length ? form.doneEnrolled : form.done });
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
          <Button type="submit" form="subscribe-form" disabled={!studentId || !planId || !classesReady} loading={saving}>
            {plan ? form.submitFor(format.currency(plan.price_cents)) : form.submit}
          </Button>
        </>
      }
    >
      <form id="subscribe-form" onSubmit={submit} className="grid gap-5">
        {students.error ? (
          <InlineAlert tone="danger" title={form.studentsFailed}>
            <button type="button" className="font-semibold underline" onClick={() => void students.reload()}>
              {t.common.retry}
            </button>
          </InlineAlert>
        ) : students.data && students.data.length === 0 ? (
          <InlineAlert tone="warning" title={form.noStudents}>
            <Link href={`${ROUTES.students}?new=1`} className="font-semibold underline">
              {t.shell.newStudent}
            </Link>
          </InlineAlert>
        ) : (
          <Select
            label={form.student}
            searchable
            placeholder={students.data ? form.pickStudent : t.common.loading}
            value={studentId}
            onChange={(value) => {
              setStudentId(value);
            }}
            options={(students.data ?? []).map((student) => ({ value: student.id, label: student.full_name, description: student.class_level?.name }))}
          />
        )}
        {current ? <InlineAlert tone="warning" title={form.hasPackage(current.billing_plan?.name ?? "", current.current_period_end ? format.date(current.current_period_end) : "")} /> : null}

        <div className="grid gap-2">
          <p className="text-sm font-semibold">{form.plan}</p>
          {plans.length === 0 ? (
            <InlineAlert tone="warning" title={form.noPlans}>
              <Link href={`${ROUTES.packages}?new=1`} onClick={onClose} className="font-semibold underline">
                {t.billing.createPlan}
              </Link>
            </InlineAlert>
          ) : (
            <div role="radiogroup" aria-label={form.plan} className="grid gap-2">
              {plans.map((item) => {
                const selected = item.id === planId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPlanId(item.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      selected ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{item.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {[item.weekly_classes ? form.weekly(item.weekly_classes) : form.flexible, cycles[String(item.cycle_days)] ?? form.everyDays(item.cycle_days), item.lessons_per_cycle ? form.credits(item.lessons_per_cycle) : form.unlimited].join(" · ")}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold">{format.currency(item.price_cents)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {studentId && plan && needed ? (
          <div className="grid gap-2">
            <p className="flex items-center justify-between text-sm font-semibold">
              {form.pickClasses(needed)}
              <span className="tabular text-xs text-muted">{form.picked(picked.length, needed)}</span>
            </p>
            {classChoices.length === 0 ? (
              <InlineAlert tone="warning" title={form.noClasses} />
            ) : (
              <div className="grid max-h-64 gap-2 overflow-y-auto">
                {classChoices.map((item) => {
                  const option = classOption(item, t, locale);
                  const on = picked.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleClass(item.id)}
                      className={cn("flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-left transition", on ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{option.label}</span>
                        <span className="block truncate text-xs text-muted">{option.description}</span>
                      </span>
                      {on ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
