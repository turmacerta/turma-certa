"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Card, OccupancyBar } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";

type ClassRow = {
  id: string;
  name: string;
  occupancy: { enrolled_count: number; vacancies: number; max_capacity: number };
  sport?: { name: string } | null;
};

type BillingSummary = {
  openAmountCents: number;
  renewalsDue: unknown[];
};

export default function DashboardPage() {
  const { orgId } = useOrg();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [billing, setBilling] = useState<BillingSummary | null>(null);

  useEffect(() => {
    void Promise.all([
      api<ClassRow[]>(`/api/v1/organizations/${orgId}/classes`),
      api<BillingSummary>(`/api/v1/organizations/${orgId}/billing`),
    ]).then(([classRows, billingSummary]) => {
      setClasses(classRows);
      setBilling(billingSummary);
    });
  }, [orgId]);

  const openVacancies = classes.filter((item) => item.occupancy.vacancies > 0);
  const emptyClasses = classes.filter((item) => item.occupancy.enrolled_count === 0);
  const occupancy =
    classes.length === 0
      ? 0
      : Math.round(
          (classes.reduce((sum, item) => sum + item.occupancy.enrolled_count, 0) /
            classes.reduce((sum, item) => sum + item.occupancy.max_capacity, 0)) *
            100,
        );

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">
          Painel
        </p>
        <h1 className="display mt-2 text-4xl text-forest">Onde a operação fura</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Turmas com vaga</p>
          <p className="display mt-2 text-4xl">{openVacancies.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Turmas vazias</p>
          <p className="display mt-2 text-4xl">{emptyClasses.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ocupação</p>
          <p className="display mt-2 text-4xl">{Number.isFinite(occupancy) ? occupancy : 0}%</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">A receber</p>
          <p className="display mt-2 text-3xl">
            {formatBRL(billing?.openAmountCents ?? 0)}
          </p>
        </Card>
      </div>
      <Card>
        <h2 className="display text-2xl">Turmas</h2>
        <div className="mt-4 grid gap-4">
          {classes.length === 0 ? (
            <p className="text-sm text-muted">
              Crie um esporte, um professor e a primeira turma em Turmas.
            </p>
          ) : (
            classes.map((item) => (
              <div key={item.id} className="rounded-2xl bg-paper p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.name}</p>
                  <span className="text-xs text-muted">{item.sport?.name}</span>
                </div>
                <OccupancyBar
                  enrolled={item.occupancy.enrolled_count}
                  capacity={item.occupancy.max_capacity}
                />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
