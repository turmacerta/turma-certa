"use client";

import { useState } from "react";
import { Layers, MapPin, Plus, Trophy } from "lucide-react";
import { useOrg } from "@/components/org-provider";
import { Dialog, useConfirm, useToast } from "@/components/overlay";
import { Badge, Button, Card, cn, EmptyState, ErrorState, Field, LoadingList, MockBadge, PageHeader, Stepper, Switch, Tabs } from "@/components/ui";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { SPORTS, SportBadge } from "@/lib/sports";
import type { Named, SaasPlan, Unit } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Tab = "school" | "units" | "sports" | "rules";

export default function SettingsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("school");

  return (
    <div className="grid gap-6 animate-fade-up">
      <PageHeader eyebrow={t.settings.eyebrow} title={t.settings.title} description={t.settings.description} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "school", label: t.settings.tabs.school },
          { value: "units", label: t.settings.tabs.units },
          { value: "sports", label: t.settings.tabs.sports },
          { value: "rules", label: t.settings.tabs.rules },
        ]}
      />
      {tab === "school" ? <SchoolTab /> : null}
      {tab === "units" ? <UnitsTab /> : null}
      {tab === "sports" ? <SportsTab /> : null}
      {tab === "rules" ? <RulesTab /> : null}
    </div>
  );
}

function SchoolTab() {
  const { t } = useI18n();
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
      description: next === "school" ? t.settings.switchToSchoolText : t.settings.switchToAutonomousText,
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
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
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
      <Card className="grid content-start gap-4">
        <h2 className="display text-lg font-semibold">{t.settings.saasPlan}</h2>
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-semibold">{saasPlan === "school" ? t.settings.planSchool : t.settings.planAutonomous}</p>
          <p className="tabular text-muted">{t.settings.pricePerMonth(saasPlan === "school" ? 189 : 79)}</p>
        </div>
        <p className="text-sm text-muted">{saasPlan === "school" ? t.settings.planSchoolText : t.settings.planAutonomousText}</p>
        <Button variant="outline" onClick={changePlan}>
          {saasPlan === "school" ? t.settings.switchToAutonomous : t.settings.switchToSchool}
        </Button>
      </Card>
    </div>
  );
}

function UnitsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const { orgId } = useOrg();
  const units = useApi<Unit[]>(`/api/v1/organizations/${orgId}/units`);
  const [dialog, setDialog] = useState<{ kind: "unit" } | { kind: "space"; unit: Unit } | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  function open(next: typeof dialog) {
    setName("");
    setAddress("");
    setDialog(next);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog || !name.trim() || saving) return;
    setSaving(true);
    try {
      if (dialog.kind === "unit") {
        await api(`/api/v1/organizations/${orgId}/units`, { method: "POST", body: JSON.stringify({ name: name.trim(), address: address.trim() || undefined }) });
        toast({ message: t.settings.unitCreated });
      } else {
        await api(`/api/v1/organizations/${orgId}/units/${dialog.unit.id}/spaces`, { method: "POST", body: JSON.stringify({ name: name.trim() }) });
        toast({ message: t.settings.courtCreated });
      }
      setDialog(null);
      await units.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

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
              <div>
                <p className="display text-lg font-semibold">{unit.name}</p>
                <p className="text-sm text-muted">{unit.address ?? t.settings.noAddress}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => open({ kind: "space", unit })}>
                <Plus className="h-3.5 w-3.5" />
                {t.settings.addCourt}
              </Button>
            </div>
            {unit.spaces.length === 0 ? (
              <p className="text-sm text-muted">{t.settings.noCourts}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unit.spaces.map((space) => (
                  <Badge key={space.id} tone="neutral">
                    {space.name}
                  </Badge>
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
        title={dialog?.kind === "space" ? t.settings.newCourtIn(dialog.unit.name) : t.settings.newUnit}
        footer={
          <>
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

function SportsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const { orgId } = useOrg();
  const base = `/api/v1/organizations/${orgId}`;
  const sports = useApi<Named[]>(`${base}/sports`);
  const levels = useApi<Array<Named & { rank: number }>>(`${base}/levels`);
  const [sportDialog, setSportDialog] = useState(false);
  const [levelDialog, setLevelDialog] = useState(false);
  const [customSport, setCustomSport] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [levelName, setLevelName] = useState("");
  const [saving, setSaving] = useState(false);

  const existing = new Set((sports.data ?? []).map((sport) => sport.name.toLowerCase()));
  const sportName = picked === "other" ? customSport.trim() : picked ? t.sports[picked as keyof typeof t.sports] : "";

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

  async function addLevel() {
    if (levelName.trim().length < 2) return;
    setSaving(true);
    try {
      await api(`${base}/levels`, { method: "POST", body: JSON.stringify({ name: levelName.trim(), rank: levels.data?.length ?? 0 }) });
      toast({ message: t.settings.levelAdded });
      setLevelDialog(false);
      setLevelName("");
      await levels.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="grid content-start gap-4">
        <div className="flex items-center justify-between">
          <h2 className="display text-lg font-semibold">{t.settings.sports}</h2>
          <Button size="sm" variant="secondary" onClick={() => setSportDialog(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t.settings.addSport}
          </Button>
        </div>
        {sports.loading ? <LoadingList rows={2} /> : null}
        {sports.data && sports.data.length === 0 ? <EmptyState icon={<Trophy />} title={t.settings.noSportsTitle} description={t.settings.noSportsText} /> : null}
        <ul className="grid gap-2">
          {(sports.data ?? []).map((sport) => (
            <li key={sport.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <SportBadge name={sport.name} size="sm" />
              <span className="font-medium">{sport.name}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="grid content-start gap-4">
        <div className="flex items-center justify-between">
          <h2 className="display text-lg font-semibold">{t.settings.levels}</h2>
          <Button size="sm" variant="secondary" onClick={() => setLevelDialog(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t.settings.addLevel}
          </Button>
        </div>
        {levels.data && levels.data.length === 0 ? <EmptyState icon={<Layers />} title={t.settings.noLevelsTitle} description={t.settings.noLevelsText} /> : null}
        <ol className="grid gap-2">
          {[...(levels.data ?? [])]
            .sort((a, b) => a.rank - b.rank)
            .map((level, index) => (
              <li key={level.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                <span className="tabular grid h-7 w-7 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary">{index + 1}</span>
                <span className="font-medium">{level.name}</span>
              </li>
            ))}
        </ol>
      </Card>

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
        open={levelDialog}
        onClose={() => setLevelDialog(false)}
        size="sm"
        title={t.settings.newLevelTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setLevelDialog(false)}>
              {t.common.cancel}
            </Button>
            <Button disabled={levelName.trim().length < 2} loading={saving} onClick={addLevel}>
              {t.common.add}
            </Button>
          </>
        }
      >
        <Field label={t.settings.levelName} value={levelName} onChange={(event) => setLevelName(event.target.value)} placeholder={t.settings.levelPlaceholder} autoFocus />
      </Dialog>
    </div>
  );
}

function RulesTab() {
  const { t } = useI18n();
  const toast = useToast();
  const [notice, setNotice] = useState(6);
  const [validity, setValidity] = useState(30);
  const [maxCredits, setMaxCredits] = useState(4);
  const [sameLevel, setSameLevel] = useState(true);
  const [anyUnit, setAnyUnit] = useState(false);
  const [rainCredit, setRainCredit] = useState(true);

  return (
    <Card className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="display text-lg font-semibold">{t.settings.rulesTitle}</h2>
          <p className="text-sm text-muted">{t.settings.rulesText}</p>
        </div>
        <MockBadge />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stepper label={t.settings.notice} value={notice} onChange={setNotice} min={0} max={72} suffix={t.settings.noticeSuffix} hint={t.settings.noticeHint} />
        <Stepper label={t.settings.validity} value={validity} onChange={setValidity} min={7} max={120} suffix={t.settings.validitySuffix} />
        <Stepper label={t.settings.maxCredits} value={maxCredits} onChange={setMaxCredits} min={1} max={20} suffix={t.settings.maxCreditsSuffix} />
      </div>
      <div className="grid gap-4 border-t border-line pt-5">
        <Switch checked={sameLevel} onChange={setSameLevel} label={t.settings.sameLevel} description={t.settings.sameLevelHint} />
        <Switch checked={anyUnit} onChange={setAnyUnit} label={t.settings.anyUnit} />
        <Switch checked={rainCredit} onChange={setRainCredit} label={t.settings.rainCredit} description={t.settings.rainCreditHint} />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => toast({ message: t.settings.rulesMissing, tone: "info" })}>{t.settings.saveRules}</Button>
      </div>
    </Card>
  );
}
