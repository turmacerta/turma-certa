"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Badge, Button, Card, EmptyState, Field, OccupancyBar } from "@/components/ui";
import { api } from "@/lib/api";
import { weekdayLabel } from "@/lib/format";

type Named = { id: string; name: string };
type Teacher = { id: string; full_name: string };
type Schedule = { weekday: number; starts_at: string; ends_at: string };
type ClassRow = {
  id: string;
  name: string;
  format: "group" | "private";
  occupancy: { enrolled_count: number; vacancies: number; max_capacity: number };
  sport?: Named | null;
  teacher?: { id: string; full_name: string } | null;
  class_level?: Named | null;
  class_schedules: Schedule[];
};

export default function ClassesPage() {
  const { orgId } = useOrg();
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [sports, setSports] = useState<Named[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [levels, setLevels] = useState<Named[]>([]);
  const [name, setName] = useState("");
  const [sportId, setSportId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [format, setFormat] = useState<"group" | "private">("group");
  const [capacity, setCapacity] = useState(8);
  const [weekday, setWeekday] = useState(3);
  const [startsAt, setStartsAt] = useState("18:00");
  const [endsAt, setEndsAt] = useState("19:00");

  async function load() {
    const [classRows, sportRows, teacherRows, levelRows] = await Promise.all([
      api<ClassRow[]>(`/api/v1/organizations/${orgId}/classes`),
      api<Named[]>(`/api/v1/organizations/${orgId}/sports`),
      api<Teacher[]>(`/api/v1/organizations/${orgId}/teachers`),
      api<Named[]>(`/api/v1/organizations/${orgId}/levels`),
    ]);
    setClasses(classRows);
    setSports(sportRows);
    setTeachers(teacherRows);
    setLevels(levelRows);
    setSportId(sportRows[0]?.id ?? "");
    setTeacherId(teacherRows[0]?.id ?? "");
    setLevelId(levelRows[0]?.id ?? "");
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  async function createClass(event: React.FormEvent) {
    event.preventDefault();
    await api(`/api/v1/organizations/${orgId}/classes`, {
      method: "POST",
      body: JSON.stringify({
        name,
        sportId,
        teacherId: teacherId || undefined,
        classLevelId: levelId || undefined,
        format,
        maxCapacity: format === "private" ? 1 : capacity,
        schedules: [{ weekday, startsAt, endsAt }],
      }),
    });
    setName("");
    await load();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Turmas</h1>
        <p className="mt-2 text-sm text-muted">
          Capacidade, nível e vagas na mesma tela. Particular ou turma.
        </p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createClass}>
          <Field
            label="Nome da turma"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Esporte</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
              required
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Professor</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="">Sem professor</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Nível</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={levelId}
              onChange={(event) => setLevelId(event.target.value)}
            >
              <option value="">Sem nível</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Formato</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={format}
              onChange={(event) => setFormat(event.target.value as "group" | "private")}
            >
              <option value="group">Turma</option>
              <option value="private">Autônomo / particular</option>
            </select>
          </label>
          {format === "group" ? (
            <Field
              label="Capacidade"
              type="number"
              min={1}
              value={capacity}
              onChange={(event) => setCapacity(Number(event.target.value))}
            />
          ) : null}
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Dia da semana</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={weekday}
              onChange={(event) => setWeekday(Number(event.target.value))}
            >
              {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map(
                (label, index) => (
                  <option key={label} value={index}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Início"
              type="time"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
            <Field
              label="Fim"
              type="time"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Criar turma</Button>
          </div>
        </form>
      </Card>
      {classes.length === 0 ? (
        <EmptyState
          title="Nenhuma turma ainda"
          description="Cadastre esporte e professor em Espaços e níveis / Professores, depois abra a primeira turma."
        />
      ) : (
        <div className="grid gap-4">
          {classes.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="display text-2xl">{item.name}</p>
                  <p className="text-sm text-muted">
                    {item.sport?.name} · {item.teacher?.full_name ?? "Sem professor"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge tone={item.format === "private" ? "clay" : "forest"}>
                    {item.format === "private" ? "Particular" : "Turma"}
                  </Badge>
                  {item.class_level ? <Badge>{item.class_level.name}</Badge> : null}
                </div>
              </div>
              <div className="mt-4">
                <OccupancyBar
                  enrolled={item.occupancy.enrolled_count}
                  capacity={item.occupancy.max_capacity}
                />
              </div>
              {item.class_schedules.length > 0 ? (
                <p className="mt-3 text-sm text-muted">
                  {item.class_schedules
                    .map(
                      (schedule) =>
                        `${weekdayLabel(schedule.weekday)} ${schedule.starts_at.slice(0, 5)}`,
                    )
                    .join(" · ")}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
