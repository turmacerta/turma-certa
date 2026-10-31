"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { DataTable, SearchInput, Toolbar } from "@/components/data-view";
import { Badge, EmptyState, ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import type { SaasPlan } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type School = {
  id: string;
  name: string;
  saas_plan: SaasPlan;
  created_at: string;
  student_count: number;
  teacher_count: number;
  class_count: number;
  owner: { fullName: string | null; email: string | null };
};

type Summary = {
  schoolCount: number;
  autonomousCount: number;
  schoolPlanCount: number;
  newLast7Days: number;
  studentCount: number;
  organizations: School[];
};

export default function AdminHomePage() {
  const { t, format } = useI18n();
  const router = useRouter();
  const summary = useApi<Summary>("/api/v1/admin/summary");
  const [query, setQuery] = useState("");

  const schools = (summary.data?.organizations ?? []).filter(
    (school) => !query || normalize(`${school.name} ${school.owner.fullName ?? ""} ${school.owner.email ?? ""}`).includes(normalize(query)),
  );

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader eyebrow={t.admin.eyebrow} title={t.admin.title} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t.admin.clients} value={summary.data?.schoolCount ?? 0} tone="primary" />
        <StatCard label={t.admin.autonomous} value={summary.data?.autonomousCount ?? 0} />
        <StatCard label={t.admin.school} value={summary.data?.schoolPlanCount ?? 0} />
        <StatCard label={t.admin.newLast7Days} value={summary.data?.newLast7Days ?? 0} tone="success" />
      </div>

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={t.admin.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-sm" />
      </Toolbar>

      {summary.loading ? <LoadingList rows={4} /> : null}
      {summary.error ? <ErrorState message={summary.error} onRetry={() => void summary.reload()} /> : null}
      {!summary.loading && !summary.error && schools.length === 0 ? (
        <EmptyState icon={<Building2 />} title={t.admin.emptyTitle} description={t.admin.emptyText} />
      ) : null}

      {schools.length > 0 ? (
        <DataTable
          columns={[
            { label: t.admin.columns.school },
            { label: t.admin.columns.plan },
            { label: t.admin.columns.students },
            { label: t.admin.columns.teachers },
            { label: t.admin.columns.classes },
            { label: t.admin.columns.since },
          ]}
        >
          {schools.map((school) => (
            <tr key={school.id} onClick={() => router.push(`${ROUTES.admin}/${school.id}`)} className="cursor-pointer transition hover:bg-surface-2">
              <td className="px-4 py-3">
                <span className="block font-semibold">{school.name}</span>
                <span className="block truncate text-xs text-muted">
                  {school.owner.fullName ?? t.admin.noOwner}
                  {school.owner.email ? ` · ${school.owner.email}` : ""}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge tone={school.saas_plan === "school" ? "primary" : "accent"}>{school.saas_plan === "school" ? t.admin.school : t.admin.autonomous}</Badge>
              </td>
              <td className="tabular px-4 py-3">{school.student_count}</td>
              <td className="tabular px-4 py-3">{school.teacher_count}</td>
              <td className="tabular px-4 py-3">{school.class_count}</td>
              <td className="px-4 py-3 text-muted">{format.date(school.created_at)}</td>
            </tr>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}
