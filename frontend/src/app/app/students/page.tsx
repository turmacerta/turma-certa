"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { DataTable, FilterChips, SearchInput, Toolbar, ViewSwitcher } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { StudentCreateDialog, StudentDetailDrawer } from "@/components/student-forms";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LoadingList, PageHeader } from "@/components/ui";
import { readQueryParam } from "@/lib/client-store";
import { normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Named, Student } from "@/lib/types";
import { useApi, usePersistentState } from "@/lib/use-api";

const MODES = ["table", "cards"] as const;

function age(birthDate?: string | null) {
  if (!birthDate) return null;
  const birth = new Date(`${birthDate}T12:00:00`);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) years -= 1;
  return years;
}

export default function StudentsPage() {
  const { t } = useI18n();
  const { orgId, persona } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const students = useApi<Student[]>(`${base}/students`);
  const levels = useApi<Named[]>(`${base}/levels`);
  const [mode, setMode] = usePersistentState("tc-view-students", "table", MODES);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [creating, setCreating] = useState(() => Boolean(readQueryParam("new")));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canEdit = persona === "manager";

  const visible = useMemo(
    () =>
      (students.data ?? [])
        .filter((student) => level === "all" || (level === "none" ? !student.class_level : student.class_level?.id === level))
        .filter((student) => !query || normalize(`${student.full_name} ${student.email ?? ""} ${student.phone ?? ""}`).includes(normalize(query))),
    [students.data, level, query],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students.data ?? []) {
      const key = student.class_level?.id ?? "none";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [students.data]);

  const selected = students.data?.find((student) => student.id === selectedId) ?? null;
  const filtered = Boolean(query) || level !== "all";
  const levelBadge = (student: Student) =>
    student.class_level ? <Badge tone="primary">{student.class_level.name}</Badge> : <Badge tone="neutral">{t.common.noLevel}</Badge>;

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader
        eyebrow={t.students.eyebrow}
        title={t.students.title}
        description={t.students.description(students.data?.length ?? 0)}
        actions={
          canEdit ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.students.newStudent}
            </Button>
          ) : null
        }
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={t.students.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-sm" />
        <FilterChips
          value={level}
          onChange={setLevel}
          options={[
            { value: "all", label: t.common.all, count: students.data?.length },
            ...(levels.data ?? []).map((item) => ({ value: item.id, label: item.name, count: counts.get(item.id) ?? 0 })),
            { value: "none", label: t.students.noLevel, count: counts.get("none") ?? 0 },
          ]}
        />
        <div className="ml-auto">
          <ViewSwitcher value={mode} onChange={setMode} modes={MODES} />
        </div>
      </Toolbar>

      {students.loading ? <LoadingList rows={5} /> : null}
      {students.error ? <ErrorState message={students.error} onRetry={() => void students.reload()} /> : null}

      {!students.loading && !students.error && visible.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={filtered ? t.students.emptyFiltered : t.students.emptyTitle}
          description={filtered ? t.students.emptyFilteredText : t.students.emptyText}
          action={
            canEdit && !filtered ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.students.createFirst}
              </Button>
            ) : null
          }
        />
      ) : null}

      {visible.length > 0 && mode === "table" ? (
        <DataTable
          columns={[
            { label: t.students.columns.student },
            { label: t.students.columns.level },
            { label: t.students.columns.phone },
            { label: t.students.columns.age },
            { label: t.students.columns.emergency },
          ]}
        >
          {visible.map((student) => (
            <tr key={student.id} onClick={() => setSelectedId(student.id)} className="cursor-pointer transition hover:bg-surface-2">
              <td className="px-4 py-3">
                <span className="flex items-center gap-3">
                  <Avatar name={student.full_name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{student.full_name}</span>
                    <span className="block truncate text-xs text-muted">{student.email ?? t.common.noEmail}</span>
                  </span>
                </span>
              </td>
              <td className="px-4 py-3">{levelBadge(student)}</td>
              <td className="tabular px-4 py-3 text-muted">{student.phone ?? t.common.empty}</td>
              <td className="tabular px-4 py-3 text-muted">{age(student.birth_date) ?? t.common.empty}</td>
              <td className="px-4 py-3 text-muted">{student.emergency_contact_name ?? t.common.empty}</td>
            </tr>
          ))}
        </DataTable>
      ) : null}

      {visible.length > 0 && mode === "cards" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => {
            const years = age(student.birth_date);
            return (
              <Card key={student.id} onClick={() => setSelectedId(student.id)} className="flex items-center gap-4">
                <Avatar name={student.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{student.full_name}</p>
                  <p className="truncate text-sm text-muted">{student.phone ?? student.email ?? t.common.noContact}</p>
                  <div className="mt-2 flex gap-2">
                    {levelBadge(student)}
                    {years !== null ? <Badge tone="neutral">{t.common.years(years)}</Badge> : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <StudentCreateDialog open={creating} orgId={orgId} levels={levels.data ?? []} onClose={() => setCreating(false)} onCreated={() => void students.reload()} />
      <StudentDetailDrawer orgId={orgId} student={selected} levels={levels.data ?? []} onClose={() => setSelectedId(null)} onChanged={() => void students.reload()} />
    </div>
  );
}
