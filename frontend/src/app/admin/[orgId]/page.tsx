"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type School = {
  id: string;
  name: string;
  slug: string;
  saas_plan: "autonomous" | "school";
  organization_email: string | null;
  created_at: string;
  student_count: number;
  teacher_count: number;
  class_count: number;
  unit_count: number;
  owner: { fullName: string; email: string | null };
};

export default function AdminSchoolPage() {
  const params = useParams<{ orgId: string }>();
  const [school, setSchool] = useState<School | null>(null);

  async function load() {
    setSchool(await api<School>(`/api/v1/admin/organizations/${params.orgId}`));
  }

  useEffect(() => {
    void load();
  }, [params.orgId]);

  async function changePlan(saasPlan: "autonomous" | "school") {
    await api(`/api/v1/admin/organizations/${params.orgId}`, {
      method: "PATCH",
      body: JSON.stringify({ saasPlan }),
    });
    await load();
  }

  if (!school) {
    return <p className="text-muted">Carregando cliente...</p>;
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-ink">
          ← Clientes
        </Link>
        <h1 className="display mt-3 text-4xl text-forest">{school.name}</h1>
        <p className="mt-2 text-sm text-muted">
          {school.owner.fullName}
          {school.owner.email ? ` · ${school.owner.email}` : ""} · desde{" "}
          {formatDate(school.created_at)}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-muted">Alunos</p>
          <p className="display mt-2 text-4xl">{school.student_count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Professores</p>
          <p className="display mt-2 text-4xl">{school.teacher_count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Turmas</p>
          <p className="display mt-2 text-4xl">{school.class_count}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Unidades</p>
          <p className="display mt-2 text-4xl">{school.unit_count}</p>
        </Card>
      </div>
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold">Plano SaaS</p>
          <p className="text-sm text-muted">O que a escola paga para a Turma Certa.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={school.saas_plan === "school" ? "forest" : "clay"}>
            {school.saas_plan === "school" ? "Escola" : "Autônomo"}
          </Badge>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              void changePlan(school.saas_plan === "school" ? "autonomous" : "school")
            }
          >
            Trocar para {school.saas_plan === "school" ? "Autônomo" : "Escola"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
