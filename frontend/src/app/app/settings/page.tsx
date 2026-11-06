"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import { Menu, MenuItem } from "@/components/menu";
import { LogoMark, LogoSportPicker, type LogoSport } from "@/components/brand";
import { useOrg } from "@/components/org-provider";
import { Dialog, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Button, Card, cn, EmptyState, ErrorState, Field, IconButton, LoadingList, PageHeader, Segmented, Stepper, Switch, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { PRICING } from "@/lib/plans";
import { SPORTS, SportBadge } from "@/lib/sports";
import type { Level, MemberTag, Named, SaasPlan, Teacher, Unit } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Tab = "school" | "units" | "sports" | "rules";

export default function SettingsPage() {
  const { t } = useI18n();
  const { can } = useOrg();
  const tabs: Tab[] = can("settings.manage") ? ["school", "units", "sports", "rules"] : [];
  const [tab, setTab] = useState<Tab>("school");

  return (
    <div className="grid grid-cols-1 gap-6 animate-fade-up">
      <PageHeader title={t.settings.title} description={t.settings.description} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={tabs.map((value) => ({ value, label: t.settings.tabs[value] }))}
      />
      {tab === "school" ? <SchoolTab /> : null}
      {tab === "units" ? <UnitsTab /> : null}
      {tab === "sports" ? <SportsTab /> : null}
      {tab === "rules" ? <RulesTab /> : null}
    </div>
  );
}

function SchoolTab() {
  const { t, format } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { orgId, orgName, saasPlan, refresh } = useOrg();
  const organization = useApi<{ name: string; email: string | null; phone: string | null }>(`/api/v1/organizations/${orgId}`);
  const [edits, setEdits] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const name = edits.name ?? organization.data?.name ?? orgName;
  const email = edits.email ?? organization.data?.email ?? "";
  const phone = edits.phone ?? organization.data?.phone ?? "";
  const dirty = Object.keys(edits).length > 0;

  async function save() {
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined }),
      });
      toast({ message: t.settings.saved });
      await organization.reload();
      setEdits({});
      await refresh();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePlan() {
    const next: SaasPlan = saasPlan === "school" ? "autonomous" : "school";
    const ok = await confirm({
      title: next === "school" ? t.settings.switchToSchoolTitle : t.settings.switchToAutonomousTitle,
      description:
        next === "school"
          ? t.settings.switchToSchoolText(format.currency(PRICING.baseCents.school), format.currency(PRICING.tagCents.manager), format.currency(PRICING.tagCents.teacher))
          : t.settings.switchToAutonomousText(format.currency(PRICING.baseCents.autonomous)),
      confirmLabel: t.settings.switchConfirm,
      tone: next === "autonomous" ? "danger" : "default",
    });
    if (!ok) return;
    try {
      await api(`/api/v1/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify({ saasPlan: next }) });
      toast({ message: t.settings.planChanged });
      await refresh();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  if (organization.loading) return <LoadingList rows={2} />;
  if (organization.error) return <ErrorState message={organization.error} onRetry={() => void organization.reload()} />;

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <h2 className="display text-lg font-semibold">{t.settings.schoolData}</h2>
        <Field label={t.settings.name} value={name} onChange={(event) => setEdits((current) => ({ ...current, name: event.target.value }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t.settings.contactEmail}
            type="email"
            optional
            value={email}
            onChange={(event) => setEdits((current) => ({ ...current, email: event.target.value }))}
          />
          <Field
            label={t.settings.phone}
            inputMode="tel"
            optional
            value={phone}
            onChange={(event) => setEdits((current) => ({ ...current, phone: event.target.value }))}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" disabled={!dirty} onClick={() => setEdits({})}>
            {t.common.discard}
          </Button>
          <Button disabled={!dirty || name.trim().length < 2} loading={saving} onClick={save}>
            {t.common.save}
          </Button>
        </div>
      </Card>
      <LogoSection />
      <PlanSection plan={saasPlan} onChange={changePlan} />
    </div>
  );
}

function UnitsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { orgId } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const units = useApi<Unit[]>(`${base}/units`);
  const [dialog, setDialog] = useState<{ kind: "unit"; unit?: Unit } | { kind: "space"; unit: Unit; space?: Named } | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = dialog?.kind === "unit" ? Boolean(dialog.unit) : Boolean(dialog?.space);

  function open(next: NonNullable<typeof dialog>) {
    setName(next.kind === "unit" ? (next.unit?.name ?? "") : (next.space?.name ?? ""));
    setAddress(next.kind === "unit" ? (next.unit?.address ?? "") : "");
    setDialog(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog || !name.trim() || saving) return;
    setSaving(true);
    try {
      if (dialog.kind === "unit") {
        const body = JSON.stringify({ name: name.trim(), address: address.trim() || undefined });
        await (dialog.unit ? api(`${base}/units/${dialog.unit.id}`, { method: "PATCH", body }) : api(`${base}/units`, { method: "POST", body }));
        toast({ message: dialog.unit ? t.settings.changesSaved : t.settings.unitCreated });
      } else {
        const body = JSON.stringify({ name: name.trim() });
        await (dialog.space ? api(`${base}/spaces/${dialog.space.id}`, { method: "PATCH", body }) : api(`${base}/units/${dialog.unit.id}/spaces`, { method: "POST", body }));
        toast({ message: dialog.space ? t.settings.changesSaved : t.settings.courtCreated });
      }
      setDialog(null);
      await units.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!dialog) return;
    const target = dialog.kind === "unit" ? dialog.unit : dialog.space;
    if (!target) return;
    const ok = await confirm({ title: t.settings.deleteTitle(target.name), description: dialog.kind === "unit" ? t.settings.deleteUnitText : t.settings.deleteCourtText, confirmLabel: t.settings.delete, tone: "danger" });
    if (!ok) return;
    try {
      await api(dialog.kind === "unit" ? `${base}/units/${target.id}` : `${base}/spaces/${target.id}`, { method: "DELETE" });
      toast({ message: t.settings.deleted(target.name) });
      setDialog(null);
      await units.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  const title = !dialog
    ? ""
    : dialog.kind === "unit"
      ? dialog.unit
        ? t.settings.editUnit
        : t.settings.newUnit
      : dialog.space
        ? t.settings.editCourt
        : t.settings.newCourtIn(dialog.unit.name);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button onClick={() => open({ kind: "unit" })}>
          <Plus className="h-4 w-4" />
          {t.settings.newUnit}
        </Button>
      </div>
      {units.loading ? <LoadingList rows={2} /> : null}
      {units.error ? <ErrorState message={units.error} onRetry={() => void units.reload()} /> : null}
      {units.data && units.data.length === 0 ? <EmptyState icon={<MapPin />} title={t.settings.noUnitsTitle} description={t.settings.noUnitsText} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(units.data ?? []).map((unit) => (
          <Card key={unit.id} className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="display truncate text-lg font-semibold">{unit.name}</p>
                <p className="truncate text-sm text-muted">{unit.address ?? t.settings.noAddress}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton label={t.settings.editUnit} onClick={() => open({ kind: "unit", unit })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                <Button size="sm" variant="secondary" onClick={() => open({ kind: "space", unit })}>
                  <Plus className="h-3.5 w-3.5" />
                  {t.settings.addCourt}
                </Button>
              </div>
            </div>
            {unit.spaces.length === 0 ? (
              <p className="text-sm text-muted">{t.settings.noCourts}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unit.spaces.map((space) => (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => open({ kind: "space", unit, space })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-muted transition hover:text-ink"
                  >
                    {space.name}
                    <Pencil className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
      <Dialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        size="sm"
        title={title}
        footer={
          <>
            {editing ? (
              <Button variant="quiet-danger" onClick={() => void remove()} className="sm:mr-auto">
                <Trash2 className="h-4 w-4" />
                {t.settings.delete}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setDialog(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" form="unit-form" disabled={!name.trim()} loading={saving}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <form id="unit-form" onSubmit={submit} className="grid gap-4">
          <Field
            label={dialog?.kind === "space" ? t.settings.courtName : t.settings.unitName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={dialog?.kind === "space" ? t.settings.courtPlaceholder : t.settings.unitPlaceholder}
            autoFocus
          />
          {dialog?.kind === "unit" ? <Field label={t.settings.address} optional value={address} onChange={(event) => setAddress(event.target.value)} /> : null}
        </form>
      </Dialog>
    </div>
  );
}

function LogoSection() {
  const { t } = useI18n();
  const toast = useToast();
  const { orgId, logoSport, refresh } = useOrg();

  async function choose(sport: LogoSport) {
    if (sport === logoSport) return;
    try {
      await api(`/api/v1/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify({ logoSport: sport }) });
      await refresh();
      toast({ message: t.settings.logoSaved });
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <Card className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="display text-lg font-semibold">{t.settings.logoTitle}</h2>
          <p className="text-sm text-muted">{t.settings.logoText}</p>
        </div>
        <LogoMark sport={logoSport} className="h-14 w-14" />
      </div>
      <LogoSportPicker value={logoSport} onChange={(sport) => void choose(sport)} labels={t.landing.logoSports} label={t.settings.logoTitle} />
    </Card>
  );
}

type Estimate = {
  base_cents: number;
  lines: Array<{ tag: MemberTag; count: number; unit_cents: number; total_cents: number }>;
  students: number;
  total_cents: number;
};

function PlanSection({ plan, onChange }: { plan: SaasPlan; onChange: () => void }) {
  const { t, format } = useI18n();
  const { orgId } = useOrg();
  const estimate = useApi<Estimate>(`/api/v1/organizations/${orgId}/pricing`);
  const plans = t.settings.plans;

  return (
    <Card className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="display text-lg font-semibold">{plans.monthlyTitle}</h2>
          <p className="text-sm text-muted">{plans.monthlyText}</p>
        </div>
        <p className="display tabular text-3xl font-semibold">
          {estimate.data ? format.currency(estimate.data.total_cents) : t.common.empty}
          <span className="text-sm font-normal text-muted">{plans.perMonth}</span>
        </p>
      </div>
      {estimate.error ? <ErrorState message={estimate.error} onRetry={() => void estimate.reload()} /> : null}
      {estimate.data ? (
        <dl className="grid gap-2 rounded-2xl bg-surface-2 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt>{plans.base}</dt>
            <dd className="tabular font-semibold">{format.currency(estimate.data.base_cents)}</dd>
          </div>
          {estimate.data.lines.map((line) => (
            <div key={line.tag} className="flex justify-between gap-3">
              <dt className={line.count ? "" : "text-muted"}>{plans.line(line.count, t.tags[line.tag], format.currency(line.unit_cents))}</dt>
              <dd className="tabular font-semibold">{format.currency(line.total_cents)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 text-muted">
            <dt>{plans.students(estimate.data.students)}</dt>
            <dd>{t.settings.team.free}</dd>
          </div>
        </dl>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div>
          <p className="font-semibold">{plans.modeTitle}</p>
          <p className="text-sm text-muted">{plan === "school" ? plans.modeSchool : plans.modeAutonomous}</p>
        </div>
        <Segmented
          label={plans.modeTitle}
          value={plan}
          onChange={(next) => (next !== plan ? onChange() : undefined)}
          options={[
            { value: "autonomous", label: t.settings.planAutonomous },
            { value: "school", label: t.settings.planSchool },
          ]}
        />
      </div>
    </Card>
  );
}

function SportsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const { orgId, saasPlan } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const school = saasPlan === "school";
  const sports = useApi<Named[]>(`${base}/sports`);
  const levels = useApi<Level[]>(`${base}/levels`);
  const teachers = useApi<Teacher[]>(school ? `${base}/teachers` : null);
  const [sportDialog, setSportDialog] = useState(false);
  const [levelSport, setLevelSport] = useState<Named | null>(null);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [sportEdit, setSportEdit] = useState<Named | null>(null);
  const [sportEditName, setSportEditName] = useState("");
  const [customSport, setCustomSport] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [levelName, setLevelName] = useState("");
  const [saving, setSaving] = useState(false);

  const existing = new Set((sports.data ?? []).map((sport) => sport.name.toLowerCase()));
  const sportName = picked === "other" ? customSport.trim() : picked ? t.sports[picked as keyof typeof t.sports] : "";
  const levelsOf = (sportId: string) => (levels.data ?? []).filter((level) => level.sport_id === sportId).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  const teachersOf = (sportId: string) => (teachers.data ?? []).filter((teacher) => teacher.teacher_sports?.some((link) => link.sport?.id === sportId));

  async function addSport() {
    if (sportName.length < 2) return;
    setSaving(true);
    try {
      await api(`${base}/sports`, { method: "POST", body: JSON.stringify({ name: sportName }) });
      toast({ message: t.settings.sportAdded(sportName) });
      setSportDialog(false);
      setPicked(null);
      setCustomSport("");
      await sports.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  function openLevel(sport: Named, level?: Level) {
    setLevelSport(sport);
    setEditingLevel(level ?? null);
    setLevelName(level?.name ?? "");
  }

  async function saveSport() {
    if (!sportEdit || sportEditName.trim().length < 2) return;
    setSaving(true);
    try {
      await api(`${base}/sports/${sportEdit.id}`, { method: "PATCH", body: JSON.stringify({ name: sportEditName.trim() }) });
      toast({ message: t.settings.changesSaved });
      setSportEdit(null);
      await Promise.all([sports.reload(), teachers.reload()]);
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function removeSport() {
    if (!sportEdit) return;
    const ok = await confirm({ title: t.settings.deleteTitle(sportEdit.name), description: t.settings.deleteSportText, confirmLabel: t.settings.delete, tone: "danger" });
    if (!ok) return;
    try {
      await api(`${base}/sports/${sportEdit.id}`, { method: "DELETE" });
      toast({ message: t.settings.deleted(sportEdit.name) });
      setSportEdit(null);
      await Promise.all([sports.reload(), levels.reload(), teachers.reload()]);
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  async function removeLevel() {
    if (!editingLevel) return;
    const ok = await confirm({ title: t.settings.deleteTitle(editingLevel.name), description: t.settings.deleteLevelText, confirmLabel: t.settings.delete, tone: "danger" });
    if (!ok) return;
    try {
      await api(`${base}/levels/${editingLevel.id}`, { method: "DELETE" });
      toast({ message: t.settings.deleted(editingLevel.name) });
      setLevelSport(null);
      await levels.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  async function addLevel() {
    if (!levelSport || levelName.trim().length < 2) return;
    setSaving(true);
    try {
      if (editingLevel) {
        await api(`${base}/levels/${editingLevel.id}`, { method: "PATCH", body: JSON.stringify({ name: levelName.trim() }) });
      } else {
        await api(`${base}/levels`, {
          method: "POST",
          body: JSON.stringify({ name: levelName.trim(), rank: levelsOf(levelSport.id).length, sportId: levelSport.id }),
        });
      }
      toast({ message: editingLevel ? t.settings.changesSaved : t.settings.levelAdded });
      setLevelSport(null);
      setLevelName("");
      await levels.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleTeacher(teacher: Teacher, sportId: string, linked: boolean) {
    const current = (teacher.teacher_sports ?? []).flatMap((link) => (link.sport ? [link.sport.id] : []));
    const sportIds = linked ? current.filter((id) => id !== sportId) : [...current, sportId];
    try {
      await api(`${base}/teachers/${teacher.id}/sports`, { method: "PUT", body: JSON.stringify({ sportIds }) });
      toast({ message: linked ? t.settings.teacherUnlinked : t.settings.teacherLinked });
      await teachers.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">{t.settings.sportsText}</p>
        <Button onClick={() => setSportDialog(true)}>
          <Plus className="h-4 w-4" />
          {t.settings.addSport}
        </Button>
      </div>
      {sports.loading ? <LoadingList rows={2} /> : null}
      {sports.error ? <ErrorState message={sports.error} onRetry={() => void sports.reload()} /> : null}
      {sports.data && sports.data.length === 0 ? <EmptyState icon={<Trophy />} title={t.settings.noSportsTitle} description={t.settings.noSportsText} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {(sports.data ?? []).map((sport) => {
          const sportTeachers = teachersOf(sport.id);
          const others = (teachers.data ?? []).filter((teacher) => !sportTeachers.includes(teacher));
          return (
            <Card key={sport.id} className="grid content-start gap-5">
              <div className="flex items-center gap-3">
                <SportBadge name={sport.name} />
                <p className="display min-w-0 flex-1 truncate text-lg font-semibold">{sport.name}</p>
                <IconButton
                  label={t.settings.editSport}
                  onClick={() => {
                    setSportEdit(sport);
                    setSportEditName(sport.name);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </IconButton>
              </div>
              <section className="grid gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t.settings.sportLevels}</p>
                  <Button size="sm" variant="ghost" onClick={() => openLevel(sport)}>
                    <Plus className="h-3.5 w-3.5" />
                    {t.settings.addLevel}
                  </Button>
                </div>
                {levelsOf(sport.id).length === 0 ? (
                  <p className="text-sm text-muted">{t.settings.noLevelsInSport}</p>
                ) : (
                  <ol className="flex flex-wrap gap-2">
                    {levelsOf(sport.id).map((level, index) => (
                      <li key={level.id}>
                        <button
                          type="button"
                          onClick={() => openLevel(sport, level)}
                          aria-label={t.settings.editLevelNamed(level.name)}
                          className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-sm font-medium transition hover:border-primary/40"
                        >
                          <span className="tabular grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-xs font-bold">{index + 1}</span>
                          {level.name}
                          <Pencil className="h-3 w-3 text-muted" />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
              {school ? (
                <section className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{t.settings.sportTeachers}</p>
                    {others.length > 0 ? (
                      <Menu
                        label={t.settings.addTeacherTo(sport.name)}
                        trigger={({ toggle }) => (
                          <Button size="sm" variant="ghost" onClick={toggle} aria-label={t.settings.addTeacherTo(sport.name)}>
                            <Plus className="h-3.5 w-3.5" />
                            {t.nav.teachers}
                          </Button>
                        )}
                      >
                        {(close) => (
                          <>
                            {others.map((teacher) => (
                              <MenuItem
                                key={teacher.id}
                                onClick={() => {
                                  close();
                                  void toggleTeacher(teacher, sport.id, false);
                                }}
                              >
                                {teacher.full_name}
                              </MenuItem>
                            ))}
                          </>
                        )}
                      </Menu>
                    ) : null}
                  </div>
                  {sportTeachers.length === 0 ? (
                    <p className="text-sm text-muted">{t.settings.noTeachersInSport}</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {sportTeachers.map((teacher) => (
                        <li key={teacher.id} className="flex items-center gap-1 rounded-full border border-line py-1 pl-1 pr-1.5 text-sm font-medium">
                          <Avatar name={teacher.full_name} size="sm" />
                          <span className="px-1">{teacher.full_name}</span>
                          <IconButton
                            label={t.settings.removeTeacherFrom(teacher.full_name, sport.name)}
                            className="h-6 w-6 text-muted hover:text-danger"
                            onClick={() => void toggleTeacher(teacher, sport.id, true)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Dialog
        open={sportDialog}
        onClose={() => setSportDialog(false)}
        size="lg"
        title={t.settings.addSportTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSportDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button disabled={sportName.length < 2 || existing.has(sportName.toLowerCase())} loading={saving} onClick={addSport}>
              {t.common.add}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SPORTS.map((sport) => {
              const label = t.sports[sport.key];
              const taken = existing.has(label.toLowerCase());
              return (
                <button
                  key={sport.key}
                  type="button"
                  disabled={taken}
                  aria-pressed={picked === sport.key}
                  onClick={() => setPicked(sport.key)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-semibold transition disabled:opacity-35",
                    picked === sport.key ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40",
                  )}
                >
                  <SportBadge name={sport.key === "other" ? null : label} size="sm" />
                  {label}
                </button>
              );
            })}
          </div>
          {picked === "other" ? <Field label={t.settings.sportName} value={customSport} onChange={(event) => setCustomSport(event.target.value)} autoFocus /> : null}
        </div>
      </Dialog>

      <Dialog
        open={Boolean(levelSport)}
        onClose={() => setLevelSport(null)}
        size="sm"
        title={editingLevel ? t.settings.editLevel : levelSport ? t.settings.newLevelIn(levelSport.name) : t.settings.newLevelTitle}
        footer={
          <>
            {editingLevel ? (
              <Button variant="quiet-danger" onClick={() => void removeLevel()} className="sm:mr-auto">
                <Trash2 className="h-4 w-4" />
                {t.settings.delete}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setLevelSport(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" form="level-form" disabled={levelName.trim().length < 2} loading={saving}>
              {editingLevel ? t.common.save : t.common.add}
            </Button>
          </>
        }
      >
        <form
          id="level-form"
          onSubmit={(event) => {
            event.preventDefault();
            void addLevel();
          }}
        >
          <Field label={t.settings.levelName} value={levelName} onChange={(event) => setLevelName(event.target.value)} placeholder={t.settings.levelPlaceholder} autoFocus />
        </form>
      </Dialog>

      <Dialog
        open={Boolean(sportEdit)}
        onClose={() => setSportEdit(null)}
        size="sm"
        title={t.settings.editSport}
        footer={
          <>
            <Button variant="quiet-danger" onClick={() => void removeSport()} className="sm:mr-auto">
              <Trash2 className="h-4 w-4" />
              {t.settings.delete}
            </Button>
            <Button variant="ghost" onClick={() => setSportEdit(null)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" form="sport-form" disabled={sportEditName.trim().length < 2} loading={saving}>
              {t.common.save}
            </Button>
          </>
        }
      >
        <form
          id="sport-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSport();
          }}
        >
          <Field label={t.settings.sportName} value={sportEditName} onChange={(event) => setSportEditName(event.target.value)} autoFocus />
        </form>
      </Dialog>
    </div>
  );
}

type LessonRules = { noticeHours: number; creditDays: number; maxCredits: number; sameLevel: boolean; anyUnit: boolean; rainCredit: boolean };

const DEFAULT_RULES: LessonRules = { noticeHours: 6, creditDays: 30, maxCredits: 4, sameLevel: true, anyUnit: false, rainCredit: true };

function RulesTab() {
  const { orgId } = useOrg();
  const organization = useApi<{ lesson_rules?: Partial<LessonRules> | null }>(`/api/v1/organizations/${orgId}`);
  if (organization.error) return <ErrorState message={organization.error} onRetry={() => void organization.reload()} />;
  if (!organization.data) return <LoadingList rows={2} />;
  return <RulesForm initial={{ ...DEFAULT_RULES, ...(organization.data.lesson_rules ?? {}) }} onSaved={() => void organization.reload()} />;
}

function RulesForm({ initial, onSaved }: { initial: LessonRules; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { orgId } = useOrg();
  const [rules, setRules] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof LessonRules>(key: K) => (value: LessonRules[K]) => setRules((current) => ({ ...current, [key]: value }));
  const dirty = JSON.stringify(rules) !== JSON.stringify(initial);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/v1/organizations/${orgId}`, { method: "PATCH", body: JSON.stringify({ lessonRules: rules }) });
      toast({ message: t.settings.rulesSaved });
      onSaved();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="grid gap-6">
      <div>
        <h2 className="display text-lg font-semibold">{t.settings.rulesTitle}</h2>
        <p className="text-sm text-muted">{t.settings.rulesText}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stepper label={t.settings.notice} value={rules.noticeHours} onChange={set("noticeHours")} min={0} max={72} suffix={t.settings.noticeSuffix} hint={t.settings.noticeHint} />
        <Stepper label={t.settings.validity} value={rules.creditDays} onChange={set("creditDays")} min={7} max={120} suffix={t.settings.validitySuffix} />
        <Stepper label={t.settings.maxCredits} value={rules.maxCredits} onChange={set("maxCredits")} min={1} max={20} suffix={t.settings.maxCreditsSuffix} />
      </div>
      <div className="grid gap-4 border-t border-line pt-5">
        <Switch checked={rules.sameLevel} onChange={set("sameLevel")} label={t.settings.sameLevel} description={t.settings.sameLevelHint} />
        <Switch checked={rules.anyUnit} onChange={set("anyUnit")} label={t.settings.anyUnit} />
        <Switch checked={rules.rainCredit} onChange={set("rainCredit")} label={t.settings.rainCredit} description={t.settings.rainCreditHint} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty} onClick={() => setRules(initial)}>
          {t.common.discard}
        </Button>
        <Button onClick={() => void save()} disabled={!dirty} loading={saving}>
          {t.settings.saveRules}
        </Button>
      </div>
    </Card>
  );
}
