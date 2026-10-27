"use client";

import { useEffect, useState } from "react";
import { useOrg } from "@/components/org-provider";
import { Button, Card, EmptyState, Field } from "@/components/ui";
import { api } from "@/lib/api";

type Teacher = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

export default function TeachersPage() {
  const { orgId } = useOrg();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function load() {
    setTeachers(await api<Teacher[]>(`/api/v1/organizations/${orgId}/teachers`));
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  async function createTeacher(event: React.FormEvent) {
    event.preventDefault();
    await api(`/api/v1/organizations/${orgId}/teachers`, {
      method: "POST",
      body: JSON.stringify({ fullName, email: email || undefined, phone: phone || undefined }),
    });
    setFullName("");
    setEmail("");
    setPhone("");
    await load();
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="display text-4xl text-forest">Professores</h1>
        <p className="mt-2 text-sm text-muted">
          A agenda da escola só fecha quando cada professor tem turma e horário.
        </p>
      </div>
      <Card>
        <form className="grid gap-4 md:grid-cols-3" onSubmit={createTeacher}>
          <Field
            label="Nome"
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
          <div className="md:col-span-3">
            <Button type="submit">Adicionar professor</Button>
          </div>
        </form>
      </Card>
      {teachers.length === 0 ? (
        <EmptyState
          title="Nenhum professor"
          description="No plano autônomo, cadastre você mesmo. No plano escola, monte o time."
        />
      ) : (
        <div className="grid gap-3">
          {teachers.map((teacher) => (
            <Card key={teacher.id}>
              <p className="font-semibold">{teacher.full_name}</p>
              <p className="text-sm text-muted">
                {teacher.email ?? "Sem e-mail"} · {teacher.phone ?? "Sem telefone"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
