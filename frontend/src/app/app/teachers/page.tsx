"use client";

import { useMemo, useState } from "react";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { SearchInput, Toolbar, Pagination, usePaged } from "@/components/data-view";
import { useOrg } from "@/components/org-provider";
import { Dialog, Drawer, useConfirm, useToast } from "@/components/overlay";
import { PhotoInput } from "@/components/photo-input";
import { Avatar, Badge, Button, Card, cn, EmptyState, ErrorState, Field, LoadingList, PageHeader, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import { isValidEmail } from "@/lib/auth";
import { classTitle, scheduleSummary } from "@/lib/classes";
import { errorMessage } from "@/lib/errors";
import { hoursBetween, maskPhone, normalize } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { SportBadge, SportIcon } from "@/lib/sports";
import type { ClassRow, Named, Teacher } from "@/lib/types";
import { useApi } from "@/lib/use-api";


type Load = { hours: number; classes: ClassRow[]; students: number; sports: Set<string> };


export default function TeachersPage() {
  const { t, locale, format } = useI18n();
  const { orgId, can } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const teachers = useApi<Teacher[]>(`${base}/teachers`);
  const classes = useApi<ClassRow[]>(`${base}/classes`);
  const sports = useApi<Named[]>(`${base}/sports`);
  const toast = useToast();
  const [granting, setGranting] = useState(false);

  async function grantAccess(teacherId: string) {
    setGranting(true);
    try {
      const result = await api<{ email: string; invited: boolean }>(`/api/v1/organizations/${orgId}/teachers/${teacherId}/access`, { method: "POST" });
      toast({ message: result.invited ? t.access.invitedTo(result.email) : t.access.linkedTo(result.email) });
      await teachers.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setGranting(false);
    }
  }

  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useMemo(() => {
    const map = new Map<string, Load>();
    for (const item of classes.data ?? []) {
      if (!item.teacher) continue;
      const entry = map.get(item.teacher.id) ?? { hours: 0, classes: [], students: 0, sports: new Set<string>() };
      entry.classes.push(item);
      entry.students += item.occupancy.enrolled_count;
      if (item.sport) entry.sports.add(item.sport.name);
      entry.hours += item.class_schedules.reduce((sum, schedule) => sum + hoursBetween(schedule.starts_at, schedule.ends_at), 0);
      map.set(item.teacher.id, entry);
    }
    return map;
  }, [classes.data]);

  const visible = (teachers.data ?? []).filter((teacher) => !query || normalize(teacher.full_name).includes(normalize(query)));
  const paged = usePaged(visible, String(visible.length));
  const selected = teachers.data?.find((teacher) => teacher.id === selectedId) ?? null;
  const selectedLoad = selected ? load.get(selected.id) : undefined;

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader
        title={t.teachers.title}
        description={teachers.data ? t.teachers.description(teachers.data.length) : undefined}
        actions={
          can("teachers.manage") ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              {t.teachers.newTeacher}
            </Button>
          ) : null
        }
      />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder={t.teachers.searchPlaceholder} className="min-w-56 flex-1 sm:max-w-xs" />
      </Toolbar>

      {teachers.loading ? <LoadingList rows={4} /> : null}
      {teachers.error ? <ErrorState message={teachers.error} onRetry={() => void teachers.reload()} /> : null}
      {!teachers.loading && !teachers.error && visible.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title={query ? t.teachers.emptyFiltered : t.teachers.emptyTitle}
          description={query ? t.teachers.emptyFilteredText : t.teachers.emptyText}
          action={
            query ? null : (
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" />
                {t.teachers.createFirst}
              </Button>
            )
          }
        />
      ) : null}

      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {paged.items.map((teacher) => {
            const entry = load.get(teacher.id);
            return (
              <Card key={teacher.id} onClick={() => setSelectedId(teacher.id)} className="flex items-center gap-3">
                <Avatar name={teacher.full_name} src={teacher.photo_url} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{teacher.full_name}</p>
                  <p className="truncate text-sm text-muted">{[...(entry?.sports ?? [])].join(", ") || t.teachers.noClasses}</p>
                  {entry ? (
                    <p className="tabular mt-1 text-xs text-muted">{t.teachers.summary(entry.classes.length, entry.students, format.hours(entry.hours))}</p>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Pagination {...paged} />

      <TeacherDialog open={creating} orgId={orgId} sports={sports.data ?? []} onClose={() => setCreating(false)} onSaved={() => void teachers.reload()} />
      <TeacherDialog
        open={Boolean(editing)}
        teacher={editing}
        orgId={orgId}
        sports={sports.data ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => void teachers.reload()}
        onDeleted={() => {
          setEditing(null);
          setSelectedId(null);
          void teachers.reload();
          void classes.reload();
        }}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.full_name ?? ""}
        subtitle={selected?.email ?? selected?.phone ?? undefined}
        footer={
          selected && can("teachers.manage") ? (
            <Button variant="outline" onClick={() => setEditing(selected)}>
              <Pencil className="h-4 w-4" />
              {t.teachers.form.editTitle}
            </Button>
          ) : null
        }
      >
        {selected ? (
          <div className="grid gap-6">
            <div className="flex items-center gap-4">
              {can("teachers.manage") ? (
                <PhotoInput
                  name={selected.full_name}
                  src={selected.photo_url}
                  onUpload={async (dataUrl) => {
                    await api(`/api/v1/organizations/${orgId}/teachers/${selected.id}/photo`, { method: "PUT", body: JSON.stringify({ dataUrl }) });
                    await teachers.reload();
                  }}
                />
              ) : (
                <Avatar name={selected.full_name} src={selected.photo_url} size="lg" />
              )}
              <div className="min-w-0 flex-1">
                {selected.bio ? <p className="text-sm text-muted">{selected.bio}</p> : null}
              </div>
              {selected.profile_id ? (
                <Badge tone="success">{t.access.hasAccess}</Badge>
              ) : can("teachers.manage") ? (
                <Button size="sm" variant="outline" loading={granting} onClick={() => void grantAccess(selected.id)}>
                  {t.access.grant}
                </Button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label={t.teachers.hoursPerWeek} value={format.hours(selectedLoad?.hours ?? 0)} />
              <Metric label={t.teachers.classes} value={String(selectedLoad?.classes.length ?? 0)} />
              <Metric label={t.teachers.students} value={String(selectedLoad?.students ?? 0)} />
            </div>
            <section className="grid gap-2">
              <h3 className="font-semibold">{t.teachers.weekGrid}</h3>
              {(selectedLoad?.classes ?? []).length === 0 ? (
                <p className="text-sm text-muted">{t.teachers.noAssigned}</p>
              ) : (
                <ul className="grid gap-2">
                  {selectedLoad!.classes.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                      <SportBadge name={item.sport?.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{classTitle(item, t)}</span>
                        <span className="block text-xs text-muted">{scheduleSummary(item.class_schedules, locale, t.common.noSchedule)}</span>
                      </span>
                      <Badge tone="neutral">
                        {item.occupancy.enrolled_count}/{item.occupancy.max_capacity}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3">
      <p className="display tabular text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}

type TeacherDialogProps = {
  open: boolean;
  teacher?: Teacher | null;
  orgId: string;
  sports: Named[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
};

function TeacherDialog(props: TeacherDialogProps) {
  return props.open ? <TeacherDialogBody key={props.teacher?.id ?? "new"} {...props} /> : null;
}

function TeacherDialogBody({ open, teacher, orgId, sports, onClose, onSaved, onDeleted }: TeacherDialogProps) {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [fullName, setFullName] = useState(teacher?.full_name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [phone, setPhone] = useState(teacher?.phone ? maskPhone(teacher.phone) : "");
  const [bio, setBio] = useState(teacher?.bio ?? "");
  const [sportIds, setSportIds] = useState<string[]>(() => (teacher?.teacher_sports ?? []).flatMap((link) => (link.sport ? [link.sport.id] : [])));
  const [saving, setSaving] = useState(false);
  const form = t.teachers.form;
  const base = `/api/v1/organizations/${orgId}/teachers`;

  const valid = fullName.trim().length >= 2 && isValidEmail(email.trim()) && phone.replace(/\D/g, "").length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (teacher) {
        await api(`${base}/${teacher.id}`, {
          method: "PATCH",
          body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), bio: bio.trim() }),
        });
        await api(`${base}/${teacher.id}/sports`, { method: "PUT", body: JSON.stringify({ sportIds }) });
        toast({ message: form.saved });
      } else {
        const created = await api<{ access: "invited" | "linked" | "failed" }>(base, {
          method: "POST",
          body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), bio: bio.trim() || undefined, sportIds }),
        });
        toast({ message: t.access[created.access](fullName.trim(), email.trim()), tone: created.access === "failed" ? "error" : undefined });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!teacher) return;
    const ok = await confirm({ title: form.deleteTitle(teacher.full_name), description: form.deleteText, confirmLabel: form.delete, tone: "danger" });
    if (!ok) return;
    try {
      await api(`${base}/${teacher.id}`, { method: "DELETE" });
      toast({ message: form.deleted(teacher.full_name) });
      onDeleted?.();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={teacher ? form.editTitle : form.title}
      description={teacher ? undefined : form.description}
      footer={
        <>
          {teacher ? (
            <Button variant="quiet-danger" onClick={() => void remove()} className="sm:mr-auto">
              <Trash2 className="h-4 w-4" />
              {form.delete}
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="teacher-form" disabled={!valid} loading={saving}>
            {teacher ? t.common.save : form.submit}
          </Button>
        </>
      }
    >
      <form id="teacher-form" onSubmit={submit} className="grid gap-4">
        <Field label={form.fullName} value={fullName} onChange={(event) => setFullName(event.target.value)} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={form.email}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={email && !isValidEmail(email) ? t.auth.checkEmail : null}
          />
          <Field label={form.phone} inputMode="tel" value={phone} onChange={(event) => setPhone(maskPhone(event.target.value))} placeholder="(31) 99999-0000" />
        </div>
        {sports.length ? (
          <div className="grid gap-2">
            <p className="text-sm font-semibold">{form.sports}</p>
            <div className="flex flex-wrap gap-2">
              {sports.map((sport) => {
                const active = sportIds.includes(sport.id);
                return (
                  <button
                    key={sport.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSportIds((items) => (active ? items.filter((id) => id !== sport.id) : [...items, sport.id]))}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      active ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40",
                    )}
                  >
                    <SportIcon name={sport.name} className="h-4 w-4" />
                    {sport.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <TextArea label={form.bio} optional value={bio} onChange={(event) => setBio(event.target.value)} placeholder={form.bioPlaceholder} />
      </form>
    </Dialog>
  );
}
