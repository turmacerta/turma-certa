"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type School = {
  id: string;
  name: string;
  saas_plan: "autonomous" | "school";
  created_at: string;
  student_count: number;
  teacher_count: number;
  class_count: number;
  unit_count: number;
  owner: { fullName: string; email: string | null };
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
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    void api<Summary>("/api/v1/admin/summary").then(setSummary);
  }, []);

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
          Turma Certa
        </p>
        <h1 className="display mt-2 text-4xl text-forest">Escolas cliente</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Clientes</p>
          <p className="display mt-2 text-4xl">{summary?.schoolCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Autônomo</p>
          <p className="display mt-2 text-4xl">{summary?.autonomousCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Escola</p>
          <p className="display mt-2 text-4xl">{summary?.schoolPlanCount ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Novas em 7 dias</p>
          <p className="display mt-2 text-4xl">{summary?.newLast7Days ?? 0}</p>
        </Card>
      </div>
      {(summary?.organizations.length ?? 0) === 0 ? (
        <EmptyState
          title="Nenhuma escola ainda"
          description="Quando um cliente criar a escola no /app, ela aparece aqui."
        />
      ) : (
        <div className="grid gap-3">
          {summary?.organizations.map((school) => (
            <Link key={school.id} href={`/admin/${school.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-4 hover:border-forest">
                <div>
                  <p className="font-semibold">{school.name}</p>
                  <p className="text-sm text-muted">
                    {school.owner.fullName}
                    {school.owner.email ? ` · ${school.owner.email}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge tone={school.saas_plan === "school" ? "forest" : "clay"}>
                    {school.saas_plan === "school" ? "Escola" : "Autônomo"}
                  </Badge>
                  <span className="text-muted">{school.student_count} alunos</span>
                  <span className="text-muted">{school.teacher_count} prof.</span>
                  <span className="text-muted">{school.class_count} turmas</span>
                  <span className="text-muted">{formatDate(school.created_at)}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
