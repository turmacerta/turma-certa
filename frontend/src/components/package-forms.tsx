"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { BillingPlan, ClassFormat, Named } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Dialog, useToast } from "./overlay";
import { Button, Checkbox, Field, Segmented, Select, Stepper } from "./ui";

type PackageDialogProps = { open: boolean; orgId: string; editing?: BillingPlan | null; onClose: () => void; onSaved: () => void };

export function PackageDialog(props: PackageDialogProps) {
  return props.open ? <PackageDialogBody {...props} /> : null;
}

function centsToText(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function PackageDialogBody({ open, orgId, editing, onClose, onSaved }: PackageDialogProps) {
  const { t, format } = useI18n();
  const toast = useToast();
  const form = t.billing.planForm;
  const [name, setName] = useState(editing?.name ?? "");
  const [planFormat, setPlanFormat] = useState<ClassFormat>(editing?.format ?? "group");
  const [price, setPrice] = useState(editing ? centsToText(editing.price_cents) : "");
  const [unlimited, setUnlimited] = useState(editing ? editing.lessons_per_cycle === null : false);
  const [lessons, setLessons] = useState(editing?.lessons_per_cycle ?? 8);
  const [cycle, setCycle] = useState(String(editing?.cycle_days ?? 30));
  const sports = useApi<Named[]>(`/api/v1/organizations/${orgId}/sports`);
  const [sportId, setSportId] = useState(editing?.sport_id ?? "");
  const [flexible, setFlexible] = useState(editing ? !editing.weekly_classes : false);
  const [weekly, setWeekly] = useState(editing?.weekly_classes ?? 2);
  const [saving, setSaving] = useState(false);

  const cents = Math.round(Number(price.replace(/\./g, "").replace(",", ".")) * 100);
  const valid = name.trim().length >= 2 && Number.isFinite(cents) && cents > 0;
  const cycleOptions = Object.entries(form.cycles).map(([value, label]) => ({ value, label }));
  if (!form.cycles[cycle]) cycleOptions.push({ value: cycle, label: form.everyDays(Number(cycle)) });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    const body = { name: name.trim(), cycleDays: Number(cycle), lessonsPerCycle: unlimited ? null : lessons, priceCents: cents, sportId: sportId || null, weeklyClasses: flexible ? null : weekly };
    try {
      if (editing) {
        await api(`/api/v1/organizations/${orgId}/billing/plans/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ message: form.saved(name.trim()) });
      } else {
        await api(`/api/v1/organizations/${orgId}/billing/plans`, {
          method: "POST",
          body: JSON.stringify({ ...body, format: planFormat, lessonsPerCycle: unlimited ? undefined : lessons, sportId: sportId || undefined, weeklyClasses: flexible ? undefined : weekly }),
        });
        toast({ message: form.created(name.trim()) });
      }
      onSaved();
      onClose();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? form.editTitle : form.title}
      description={editing ? form.editDescription : form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="plan-form" disabled={!valid} loading={saving}>
            {editing ? form.save : form.submit}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} className="grid gap-4">
        {editing ? null : (
          <Segmented
            label={form.type}
            value={planFormat}
            onChange={setPlanFormat}
            options={[
              { value: "group", label: t.common.group },
              { value: "private", label: t.common.private },
            ]}
          />
        )}
        <Field label={form.name} value={name} onChange={(event) => setName(event.target.value)} placeholder={form.namePlaceholder} autoFocus />
        <Select
          label={form.sport}
          value={sportId}
          onChange={setSportId}
          options={[{ value: "", label: form.anySport }, ...(sports.data ?? []).map((sport) => ({ value: sport.id, label: sport.name }))]}
        />
        <div className="grid gap-3">
          {flexible ? null : (
            <Stepper
              label={form.weekly}
              hint={form.weeklyHint}
              value={weekly}
              onChange={(value) => {
                setWeekly(value);
                if (!unlimited) setLessons(value * 4);
              }}
              min={1}
              max={7}
            />
          )}
          <Checkbox label={form.flexible} checked={flexible} onChange={setFlexible} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={form.price} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^\d,.]/g, ""))} placeholder={form.pricePlaceholder} />
          <Select label={form.cycle} value={cycle} onChange={setCycle} options={cycleOptions} />
        </div>
        <div className="grid gap-3">
          {unlimited ? null : <Stepper label={form.lessons} value={lessons} onChange={setLessons} min={1} max={40} />}
          <Checkbox label={form.unlimited} checked={unlimited} onChange={setUnlimited} />
        </div>
        {valid && !unlimited ? <p className="text-sm text-muted">{form.perLessonHint(format.currency(Math.round(cents / lessons)))}</p> : null}
      </form>
    </Dialog>
  );
}
