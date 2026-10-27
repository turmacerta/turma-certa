"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Card, Field } from "./ui";

type Membership = {
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    saas_plan: "autonomous" | "school";
  };
};

type OrgContextValue = {
  orgId: string;
  orgName: string;
  role: string;
  isPlatformAdmin: boolean;
  refresh: () => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrg() {
  const value = useContext(OrgContext);
  if (!value) {
    throw new Error("useOrg must be used inside OrgProvider");
  }
  return value;
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<"autonomous" | "school">("autonomous");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api<{ memberships: Membership[]; isPlatformAdmin: boolean }>(
        "/api/v1/me",
      );
      setIsPlatformAdmin(Boolean(me.isPlatformAdmin));
      setMemberships(
        (me.memberships ?? []).filter((item) => item.organization) as Membership[],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a escola.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const current = memberships[0];

  const value = useMemo(
    () =>
      current
        ? {
            orgId: current.organization.id,
            orgName: current.organization.name,
            role: current.role,
            isPlatformAdmin,
            refresh: load,
          }
        : null,
    [current, isPlatformAdmin, load],
  );

  async function createSchool(event: React.FormEvent) {
    event.preventDefault();
    await api("/api/v1/organizations", {
      method: "POST",
      body: JSON.stringify({ name, saasPlan: plan }),
    });
    await load();
  }

  if (loading) {
    return <p className="p-8 text-muted">Carregando sua escola...</p>;
  }

  if (error) {
    return (
      <Card className="m-8 max-w-xl">
        <p className="display text-2xl">API ou Supabase pendentes</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <p className="mt-4 text-sm text-muted">
          Configure o `.env`, rode as migrations no SQL Editor e suba de novo com
          `npm run dev`.
        </p>
      </Card>
    );
  }

  if (!value) {
    return (
      <Card className="m-8 max-w-xl">
        <p className="display text-3xl">Crie sua escola</p>
        <p className="mt-2 text-sm text-muted">
          Autônomo para um professor. Escola quando houver time, unidades e quadras.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={createSchool}>
          <Field
            label="Nome da escola ou do professor"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Plano SaaS</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={plan}
              onChange={(event) =>
                setPlan(event.target.value as "autonomous" | "school")
              }
            >
              <option value="autonomous">Autônomo</option>
              <option value="school">Escola</option>
            </select>
          </label>
          <Button type="submit">Começar</Button>
        </form>
        {isPlatformAdmin ? (
          <p className="mt-4 text-sm">
            <Link href="/admin" className="font-semibold text-forest">
              Ir para o backoffice
            </Link>
          </p>
        ) : null}
      </Card>
    );
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
