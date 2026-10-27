"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button, Card, EmptyState } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";

type Session = {
  id: string;
  starts_at: string;
  ends_at: string;
  class_group?: { name: string; format: string } | null;
  teacher?: { full_name: string } | null;
  space?: { name: string } | null;
};

type ClassOption = { id: string; name: string };

export default function SchedulePage() {
  const { orgId } = useOrg();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classGroupId, setClassGroupId] = useState("");

  async function load() {
    const [sessionRows, classRows] = await Promise.all([
      api<Session[]>(`/api/v1/organizations/${orgId}/schedule`),
      api<ClassOption[]>(`/api/v1/organizations/${orgId}/classes`),
    ]);
    setSessions(sessionRows);
    setClasses(classRows);
    setClassGroupId(classRows[0]?.id ?? "");
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  async function generate() {
    if (!classGroupId) {
      return;
    }
    await api(`/api/v1/organizations/${orgId}/schedule/generate`, {
      method: "POST",
      body: JSON.stringify({ classGroupId, weeks: 4 }),
    });
    await load();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Agenda</h1>
        <p className="mt-2 text-sm text-muted">
          Aulas geradas a partir do horário recorrente da turma.
        </p>
      </div>
      <Card className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium text-forest">Turma</span>
          <select
            className="rounded-2xl border border-line bg-paper px-3 py-2.5"
            value={classGroupId}
            onChange={(event) => setClassGroupId(event.target.value)}
          >
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={generate}>
          Gerar 4 semanas
        </Button>
      </Card>
      {sessions.length === 0 ? (
        <EmptyState
          title="Agenda vazia"
          description="Crie a turma com horário e gere as sessões. Falta e reposição entram na chamada de cada aula."
        />
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Card key={session.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{session.class_group?.name}</p>
                <p className="text-sm text-muted">
                  {formatDate(session.starts_at)} ·{" "}
                  {new Date(session.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <p className="text-sm text-muted">
                {session.teacher?.full_name ?? "Professor a definir"}
                {session.space ? ` · ${session.space.name}` : ""}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
