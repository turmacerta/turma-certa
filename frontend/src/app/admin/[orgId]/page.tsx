"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, ErrorState, LoadingList, PageHeader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
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
  unit_count: number;
  owner: { fullName: string | null; email: string | null };
};

export default function AdminSchoolPage() {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const params = useParams<{ orgId: string }>();
  const school = useApi<School>(`/api/v1/admin/organizations/${params.orgId}`);
  const data = school.data;

  async function changePlan() {
    if (!data) return;
    const next: SaasPlan = data.saas_plan === "school" ? "autonomous" : "school";
    const label = next === "school" ? t.admin.school : t.admin.autonomous;
    const ok = await confirm({ title: t.admin.switchTitle(label), description: t.admin.switchText, confirmLabel: t.admin.switchTo(label) });
    if (!ok) return;
    try {
      await api(`/api/v1/admin/organizations/${params.orgId}`, { method: "PATCH", body: JSON.stringify({ saasPlan: next }) });
      toast({ message: t.admin.switched });
      await school.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <div className="grid gap-6 animate-fade-up">
      <Link href={ROUTES.admin} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        {t.admin.clients}
      </Link>

      {school.loading ? <LoadingList rows={3} /> : null}
      {school.error ? <ErrorState message={school.error} onRetry={() => void school.reload()} /> : null}

      {data ? (
        <>
          <PageHeader
            title={data.name}
            description={`${data.owner.fullName ?? t.admin.noOwner}${data.owner.email ? ` · ${data.owner.email}` : ""} · ${t.admin.since(format.date(data.created_at))}`}
          />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t.admin.students} value={data.student_count} />
            <StatCard label={t.admin.teachers} value={data.teacher_count} />
            <StatCard label={t.admin.classes} value={data.class_count} />
            <StatCard label={t.admin.units} value={data.unit_count} />
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{t.admin.saasPlan}</p>
              <p className="text-sm text-muted">{t.admin.saasPlanText}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={data.saas_plan === "school" ? "primary" : "accent"}>{data.saas_plan === "school" ? t.admin.school : t.admin.autonomous}</Badge>
              <Button variant="outline" onClick={changePlan}>
                {t.admin.switchTo(data.saas_plan === "school" ? t.admin.autonomous : t.admin.school)}
              </Button>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
