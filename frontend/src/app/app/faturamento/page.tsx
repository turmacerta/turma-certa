"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Badge, Button, Card, EmptyState, Field } from "@/components/ui";
import { api } from "@/lib/api";
import { formatBRL, formatDate } from "@/lib/format";

type Plan = {
  id: string;
  name: string;
  format: "group" | "private";
  price_cents: number;
  cycle_days: number;
};

type Invoice = {
  id: string;
  amount_cents: number;
  status: string;
  due_date: string;
  student?: { full_name: string } | null;
};

type Renewal = {
  id: string;
  current_period_end: string;
  student?: { full_name: string } | null;
  billing_plan?: { name: string } | null;
};

type Summary = {
  openAmountCents: number;
  invoices: Invoice[];
  renewalsDue: Renewal[];
  subscriptions: unknown[];
};

export default function BillingPage() {
  const { orgId } = useOrg();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [name, setName] = useState("");
  const [format, setFormat] = useState<"group" | "private">("group");
  const [price, setPrice] = useState("189");
  const [lessons, setLessons] = useState("8");

  async function load() {
    const [billing, planRows] = await Promise.all([
      api<Summary>(`/api/v1/organizations/${orgId}/billing`),
      api<Plan[]>(`/api/v1/organizations/${orgId}/billing/plans`),
    ]);
    setSummary(billing);
    setPlans(planRows);
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  async function createPlan(event: React.FormEvent) {
    event.preventDefault();
    await api(`/api/v1/organizations/${orgId}/billing/plans`, {
      method: "POST",
      body: JSON.stringify({
        name,
        format,
        cycleDays: 30,
        lessonsPerCycle: Number(lessons),
        priceCents: Math.round(Number(price) * 100),
      }),
    });
    setName("");
    await load();
  }

  async function renew(id: string) {
    await api(`/api/v1/organizations/${orgId}/billing/subscriptions/${id}/renew`, {
      method: "POST",
    });
    await load();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Faturamento</h1>
        <p className="mt-2 text-sm text-muted">
          Plano de turmas ou particular, fatura e renovação no mesmo ciclo.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Em aberto</p>
          <p className="display mt-2 text-3xl">
            {formatBRL(summary?.openAmountCents ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Renovações em 7 dias</p>
          <p className="display mt-2 text-3xl">{summary?.renewalsDue.length ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Planos da escola</p>
          <p className="display mt-2 text-3xl">{plans.length}</p>
        </Card>
      </div>
      <Card>
        <h2 className="display text-2xl">Novo plano para o aluno</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={createPlan}>
          <Field
            label="Nome"
            placeholder="Turma 2x semana"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Tipo</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={format}
              onChange={(event) => setFormat(event.target.value as "group" | "private")}
            >
              <option value="group">Plano turmas</option>
              <option value="private">Plano autônomo / particular</option>
            </select>
          </label>
          <Field
            label="Preço mensal (R$)"
            type="number"
            min={0}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Field
            label="Aulas no ciclo"
            type="number"
            min={1}
            value={lessons}
            onChange={(event) => setLessons(event.target.value)}
          />
          <div className="md:col-span-2">
            <Button type="submit">Criar plano</Button>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="display text-2xl">Renovações da semana</h2>
        {(summary?.renewalsDue.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted">Nenhuma renovação nos próximos 7 dias.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {summary?.renewalsDue.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.student?.full_name}</p>
                  <p className="text-sm text-muted">
                    {item.billing_plan?.name} · até {formatDate(item.current_period_end)}
                  </p>
                </div>
                <Button type="button" onClick={() => void renew(item.id)}>
                  Renovar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
      {(summary?.invoices.length ?? 0) === 0 ? (
        <EmptyState
          title="Sem faturas"
          description="Quando o aluno assinar um plano, a fatura e os créditos do ciclo nascem juntos."
        />
      ) : (
        <div className="grid gap-3">
          {summary?.invoices.map((invoice) => (
            <Card key={invoice.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{invoice.student?.full_name ?? "Aluno"}</p>
                <p className="text-sm text-muted">Vence {formatDate(invoice.due_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={invoice.status === "paid" ? "forest" : "clay"}>
                  {invoice.status}
                </Badge>
                <p className="font-semibold">{formatBRL(invoice.amount_cents)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
