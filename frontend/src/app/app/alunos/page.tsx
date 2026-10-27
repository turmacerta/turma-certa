"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button, Card, EmptyState, Field } from "@/components/ui";
import { api } from "@/lib/api";

type Level = { id: string; name: string };
type Student = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  class_level?: Level | null;
};

export default function StudentsPage() {
  const { orgId } = useOrg();
  const [students, setStudents] = useState<Student[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [classLevelId, setClassLevelId] = useState("");

  async function load() {
    const [studentRows, levelRows] = await Promise.all([
      api<Student[]>(`/api/v1/organizations/${orgId}/students`),
      api<Level[]>(`/api/v1/organizations/${orgId}/levels`),
    ]);
    setStudents(studentRows);
    setLevels(levelRows);
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    await api(`/api/v1/organizations/${orgId}/students`, {
      method: "POST",
      body: JSON.stringify({
        fullName,
        email: email || undefined,
        phone: phone || undefined,
        classLevelId: classLevelId || undefined,
      }),
    });
    setFullName("");
    setEmail("");
    setPhone("");
    await load();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Alunos</h1>
        <p className="mt-2 text-sm text-muted">Ficha cadastral e nível de cada aluno.</p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={createStudent}>
          <Field
            label="Nome completo"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
          <Field
            label="E-mail"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Field
            label="Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-forest">Nível</span>
            <select
              className="rounded-2xl border border-line bg-paper px-3 py-2.5"
              value={classLevelId}
              onChange={(event) => setClassLevelId(event.target.value)}
            >
              <option value="">Definir depois</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Salvar ficha</Button>
          </div>
        </form>
      </Card>
      {students.length === 0 ? (
        <EmptyState
          title="Nenhum aluno"
          description="Cadastre a ficha para depois matricular, lançar crédito e acompanhar renovação."
        />
      ) : (
        <div className="grid gap-3">
          {students.map((student) => (
            <Card key={student.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{student.full_name}</p>
                <p className="text-sm text-muted">
                  {student.email ?? "Sem e-mail"} · {student.phone ?? "Sem telefone"}
                </p>
              </div>
              <p className="text-sm text-forest">
                {student.class_level?.name ?? "Sem nível"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
