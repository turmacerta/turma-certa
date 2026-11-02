"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, LogIn, Mail } from "lucide-react";
import { FilterChips, Pagination, SearchInput, Toolbar, usePaged } from "@/components/data-view";
import { Drawer, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, EmptyState, ErrorState, LoadingList, PageHeader, Segmented, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { writeStorage } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { SUPPORT_ORG_KEY, VIEW_AS_KEY } from "@/lib/staff";
import type { MemberTag, SaasPlan } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type PaidTag = Exclude<MemberTag, "student">;
const PAID_TAGS: PaidTag[] = ["manager", "teacher"];

type Client = {
  id: string;
  name: string;
  saas_plan: SaasPlan;
  created_at: string;
  student_count: number;
  class_count: number;
  unit_count: number;
  monthly_cents: number;
  tag_counts: Partial<Record<PaidTag, number>>;
  owner: { fullName: string | null; email: string | null };
};

type Summary = { organizations: Client[]; newLast7Days: number };
type Estimate = {
  base_cents: number;
  lines: Array<{ tag: PaidTag; count: number; unit_cents: number; total_cents: number }>;
  total_cents: number;
};
type Filter = "all" | SaasPlan | "starting";

function teamSize(client: Client) {
  return PAID_TAGS.reduce((sum, tag) => sum + (client.tag_counts[tag] ?? 0), 0);
}

export default function AdminHomePage() {
  const { t, format } = useI18n();
  const router = useRouter();
  const summary = useApi<Summary>("/api/v1/admin/summary");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const clients = useMemo(() => summary.data?.organizations ?? [], [summary.data]);
  const selected = clients.find((client) => client.id === selectedId) ?? null;
  const matchesFilter = (client: Client, value: Filter) =>
    value === "all" ? true : value === "starting" ? client.student_count === 0 : client.saas_plan === value;
  const visible = clients.filter(
    (client) => matchesFilter(client, filter) && (!query || normalize(`${client.name} ${client.owner.fullName ?? ""} ${client.owner.email ?? ""}`).includes(normalize(query))),
  );
  const paged = usePaged(visible, `${filter}|${query}`);
  const count = (value: Filter) => clients.filter((client) => matchesFilter(client, value)).length;
  const mrr = clients.reduce((sum, client) => sum + client.monthly_cents, 0);

  function enter(orgId: string) {
    writeStorage(VIEW_AS_KEY, "");
    writeStorage(SUPPORT_ORG_KEY, orgId);
    router.push(ROUTES.home);
  }

  const modeLabel = (plan: SaasPlan) => (plan === "school" ? t.admin.school : t.admin.autonomous);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.admin.title} description={t.admin.description} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label={t.admin.mrr} value={format.currency(mrr)} hint={t.admin.mrrHint} tone="success" />
        <StatCard label={t.admin.clients} value={clients.length} hint={t.admin.clientsHint(summary.data?.newLast7Days ?? 0)} tone="primary" />
        <StatCard label={t.admin.students} value={clients.reduce((sum, client) => sum + client.student_count, 0)} hint={t.admin.studentsHint} />
        <StatCard label={t.admin.filters.starting} value={count("starting")} hint={t.admin.startingHint} tone="warning" onClick={() => setFilter("starting")} />
      </div>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={t.admin.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-sm" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: t.admin.filters.all, count: clients.length },
            { value: "autonomous", label: t.admin.filters.autonomous, count: count("autonomous") },
            { value: "school", label: t.admin.filters.school, count: count("school") },
            { value: "starting", label: t.admin.filters.starting, count: count("starting") },
          ]}
        />
      </Toolbar>

      {!summary.data && !summary.error ? <LoadingList rows={4} /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={() => void summary.reload()} /> : null}
      {summary.data && visible.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={clients.length ? t.admin.emptyFilteredTitle : t.admin.emptyTitle}
          description={clients.length ? t.admin.emptyFilteredText : t.admin.emptyText}
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
          <div className="hidden grid-cols-[minmax(0,1fr)_6rem_5rem_5rem_7rem_6.5rem_6.5rem] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted md:grid">
            <span>{t.admin.columns.school}</span>
            <span>{t.admin.columns.plan}</span>
            <span>{t.admin.columns.students}</span>
            <span>{t.admin.columns.team}</span>
            <span>{t.admin.columns.mrr}</span>
            <span>{t.admin.columns.since}</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {paged.items.map((client) => (
              <li
                key={client.id}
                className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-4 transition hover:bg-surface-2 md:grid-cols-[minmax(0,1fr)_6rem_5rem_5rem_7rem_6.5rem_6.5rem]"
              >
                <button type="button" onClick={() => setSelectedId(client.id)} className="min-w-0 text-left after:absolute after:inset-0 after:content-['']">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{client.name}</span>
                    {client.student_count === 0 ? <Badge tone="neutral">{t.admin.starting}</Badge> : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {client.owner.fullName ?? t.admin.noOwner}
                    {client.owner.email ? ` · ${client.owner.email}` : ""}
                  </span>
                  <span className="block truncate text-xs text-muted md:hidden">
                    {modeLabel(client.saas_plan)} · {t.admin.perMonth(format.currency(client.monthly_cents))}
                  </span>
                </button>
                <span className="hidden md:block">
                  <Badge tone={client.saas_plan === "school" ? "primary" : "accent"}>{modeLabel(client.saas_plan)}</Badge>
                </span>
                <span className="tabular hidden text-sm md:block">{client.student_count}</span>
                <span className="tabular hidden text-sm md:block">{teamSize(client)}</span>
                <span className="tabular hidden text-sm font-semibold md:block">{format.currency(client.monthly_cents)}</span>
                <span className="hidden text-sm text-muted md:block">{format.date(client.created_at)}</span>
                <Button size="sm" variant="outline" onClick={() => enter(client.id)} className="relative z-10 col-start-2 row-span-3 row-start-1 justify-self-end md:col-start-auto md:row-span-1 md:row-start-auto">
                  <LogIn className="h-4 w-4" />
                  {t.admin.enter}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Pagination {...paged} />

      <ClientDrawer key={selected?.id ?? "closed"} client={selected} onClose={() => setSelectedId(null)} onEnter={enter} onChanged={() => void summary.reload()} />
    </div>
  );
}

function ClientDrawer({ client, onClose, onEnter, onChanged }: { client: Client | null; onClose: () => void; onEnter: (orgId: string) => void; onChanged: () => void }) {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const estimate = useApi<Estimate>(client ? `/api/v1/admin/organizations/${client.id}/pricing` : null);

  async function changeMode(next: SaasPlan) {
    if (!client || next === client.saas_plan) return;
    const label = next === "school" ? t.admin.school : t.admin.autonomous;
    const ok = await confirm({ title: t.admin.switchTitle(label), description: t.admin.switchText, confirmLabel: label });
    if (!ok) return;
    try {
      await api(`/api/v1/admin/organizations/${client.id}`, { method: "PATCH", body: JSON.stringify({ saasPlan: next }) });
      toast({ message: t.admin.switched });
      onChanged();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <Drawer
      open={Boolean(client)}
      onClose={onClose}
      title={client?.name ?? ""}
      subtitle={client ? t.admin.since(format.date(client.created_at)) : null}
      footer={
        client ? (
          <Button block onClick={() => onEnter(client.id)}>
            <LogIn className="h-4 w-4" />
            {t.admin.enterSchool}
          </Button>
        ) : null
      }
    >
      {client ? (
        <div className="grid gap-6">
          <section className="grid gap-3 rounded-3xl border border-line bg-surface-2 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{t.admin.monthly}</h3>
              <p className="display tabular text-2xl font-semibold">{estimate.data ? format.currency(estimate.data.total_cents) : t.common.empty}</p>
            </div>
            {estimate.data ? (
              <dl className="grid gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t.settings.plans.base}</dt>
                  <dd className="tabular">{format.currency(estimate.data.base_cents)}</dd>
                </div>
                {estimate.data.lines.map((line) => (
                  <div key={line.tag} className="flex justify-between gap-3">
                    <dt className="text-muted">{t.settings.plans.line(line.count, t.tags[line.tag], format.currency(line.unit_cents))}</dt>
                    <dd className="tabular">{format.currency(line.total_cents)}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-3 text-muted">
                  <dt>{t.settings.plans.students(client.student_count)}</dt>
                  <dd>{t.settings.team.free}</dd>
                </div>
              </dl>
            ) : null}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t.admin.plan}</h3>
            <Segmented
              label={t.admin.plan}
              value={client.saas_plan}
              onChange={(plan) => void changeMode(plan)}
              options={[
                { value: "autonomous", label: t.admin.autonomous },
                { value: "school", label: t.admin.school },
              ]}
            />
          </section>

          <section className="grid gap-2">
            <h3 className="text-sm font-semibold">{t.admin.owner}</h3>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{client.owner.fullName ?? t.admin.noOwner}</p>
                {client.owner.email ? <p className="truncate text-sm text-muted">{client.owner.email}</p> : null}
              </div>
              {client.owner.email ? (
                <a
                  href={`mailto:${client.owner.email}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold transition hover:bg-surface-2"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {t.admin.emailOwner}
                </a>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
