"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button, Card, Field } from "@/components/ui";
import { api } from "@/lib/api";

type Space = { id: string; name: string };
type Unit = { id: string; name: string; address: string | null; spaces: Space[] };
type Named = { id: string; name: string };

export default function SettingsPage() {
  const { orgId } = useOrg();
  const [units, setUnits] = useState<Unit[]>([]);
  const [sports, setSports] = useState<Named[]>([]);
  const [levels, setLevels] = useState<Named[]>([]);
  const [unitName, setUnitName] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [unitId, setUnitId] = useState("");
  const [sportName, setSportName] = useState("");
  const [levelName, setLevelName] = useState("");

  async function load() {
    const [unitRows, sportRows, levelRows] = await Promise.all([
      api<Unit[]>(`/api/v1/organizations/${orgId}/units`),
      api<Named[]>(`/api/v1/organizations/${orgId}/sports`),
      api<Named[]>(`/api/v1/organizations/${orgId}/levels`),
    ]);
    setUnits(unitRows);
    setSports(sportRows);
    setLevels(levelRows);
    setUnitId(unitRows[0]?.id ?? "");
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Espaços e níveis</h1>
        <p className="mt-2 text-sm text-muted">
          Unidade, quadra, esporte e classe. O restante da operação se apoia nisso.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="display text-2xl">Unidades e quadras</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await api(`/api/v1/organizations/${orgId}/units`, {
                method: "POST",
                body: JSON.stringify({ name: unitName }),
              });
              setUnitName("");
              await load();
            }}
          >
            <Field
              label="Nova unidade"
              value={unitName}
              onChange={(event) => setUnitName(event.target.value)}
              required
            />
            <Button type="submit">Criar unidade</Button>
          </form>
          <form
            className="mt-6 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!unitId) return;
              await api(`/api/v1/organizations/${orgId}/units/${unitId}/spaces`, {
                method: "POST",
                body: JSON.stringify({ name: spaceName }),
              });
              setSpaceName("");
              await load();
            }}
          >
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-forest">Unidade</span>
              <select
                className="rounded-2xl border border-line bg-paper px-3 py-2.5"
                value={unitId}
                onChange={(event) => setUnitId(event.target.value)}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Nova quadra / espaço"
              value={spaceName}
              onChange={(event) => setSpaceName(event.target.value)}
              required
            />
            <Button type="submit">Criar espaço</Button>
          </form>
          <ul className="mt-6 grid gap-3 text-sm">
            {units.map((unit) => (
              <li key={unit.id}>
                <p className="font-semibold">{unit.name}</p>
                <p className="text-muted">
                  {unit.spaces.length === 0
                    ? "Sem quadras"
                    : unit.spaces.map((space) => space.name).join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="display text-2xl">Esportes</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await api(`/api/v1/organizations/${orgId}/sports`, {
                method: "POST",
                body: JSON.stringify({ name: sportName }),
              });
              setSportName("");
              await load();
            }}
          >
            <Field
              label="Esporte"
              placeholder="Tênis, vôlei, futebol..."
              value={sportName}
              onChange={(event) => setSportName(event.target.value)}
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
          <ul className="mt-4 grid gap-2 text-sm">
            {sports.map((sport) => (
              <li key={sport.id}>{sport.name}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="display text-2xl">Níveis</h2>
          <form
            className="mt-4 grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await api(`/api/v1/organizations/${orgId}/levels`, {
                method: "POST",
                body: JSON.stringify({ name: levelName, rank: levels.length }),
              });
              setLevelName("");
              await load();
            }}
          >
            <Field
              label="Classe"
              placeholder="Iniciante, intermediário..."
              value={levelName}
              onChange={(event) => setLevelName(event.target.value)}
              required
            />
            <Button type="submit">Adicionar</Button>
          </form>
          <ul className="mt-4 grid gap-2 text-sm">
            {levels.map((level) => (
              <li key={level.id}>{level.name}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
