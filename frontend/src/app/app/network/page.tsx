"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { Button, Card, EmptyState, ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { useApi } from "@/lib/use-api";

type Row = {
  organization: { id: string; name: string };
  students: number;
  occupancy: number;
  mrr_cents: number;
  overdue_cents: number;
  lessons_today: number;
};

export default function NetworkPage() {
  const { t, format } = useI18n();
  const router = useRouter();
  const org = useOrg();
  const rows = useApi<Row[]>("/api/v1/me/network");
  const data = rows.data ?? [];
  const sum = (key: "students" | "mrr_cents" | "overdue_cents" | "lessons_today") => data.reduce((total, row) => total + row[key], 0);

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.nav.network} description={t.network.description} />
      {rows.error ? <ErrorState message={rows.error} onRetry={() => void rows.reload()} /> : null}
      {!rows.data && !rows.error ? <LoadingList rows={3} /> : null}
      {rows.data && data.length < 2 ? <EmptyState icon={<Building2 />} title={t.network.emptyTitle} description={t.network.emptyText} /> : null}

      {data.length >= 2 ? (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard label={t.network.mrr} value={format.currency(sum("mrr_cents"))} hint={t.network.total} tone="primary" />
            <StatCard label={t.network.students} value={format.number(sum("students"))} hint={t.network.total} />
            <StatCard label={t.network.overdue} value={format.currency(sum("overdue_cents"))} hint={t.network.total} tone={sum("overdue_cents") ? "danger" : "neutral"} />
            <StatCard label={t.network.lessonsToday} value={format.number(sum("lessons_today"))} hint={t.network.total} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.map((row) => (
              <Card key={row.organization.id} className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="display truncate text-lg font-semibold">{row.organization.name}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      org.switchOrg(row.organization.id);
                      router.push(ROUTES.home);
                    }}
                  >
                    {t.network.open}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                  <Metric label={t.network.students} value={format.number(row.students)} />
                  <Metric label={t.network.occupancy} value={`${row.occupancy}%`} />
                  <Metric label={t.network.lessonsToday} value={format.number(row.lessons_today)} />
                  <Metric label={t.network.mrr} value={format.currency(row.mrr_cents)} />
                  <Metric label={t.network.overdue} value={format.currency(row.overdue_cents)} danger={row.overdue_cents > 0} />
                </dl>
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular font-semibold ${danger ? "text-danger" : ""}`}>{value}</dd>
    </div>
  );
}
