"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { isValidEmail } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import type { Credit, Named, Student } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { Dialog, Drawer, useConfirm, useToast } from "./overlay";
import { PhotoInput } from "./photo-input";
import { useOrg } from "./org-provider";
import { Badge, Button, ErrorState, Field, InlineAlert, LoadingList, Segmented, Select, Stepper, Tabs, TextArea } from "./ui";

type StudentDraft = {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  classLevelId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  hasGuardian: boolean;
};

const EMPTY: StudentDraft = {
  fullName: "",
  email: "",
  phone: "",
  birthDate: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
  classLevelId: "",
  guardianName: "",
  guardianEmail: "",
  guardianPhone: "",
  hasGuardian: false,
};

const CREDIT_DAYS = 30;

type AccessResult = "invited" | "linked" | "failed";

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function toIso(value: string) {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year || year.length !== 4) return undefined;
  return `${year}-${month}-${day}`;
}

function fromIso(value?: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function draftFrom(student: Student): StudentDraft {
  return {
    fullName: student.full_name,
    email: student.email ?? "",
    phone: student.phone ?? "",
    birthDate: fromIso(student.birth_date),
    emergencyContactName: student.emergency_contact_name ?? "",
    emergencyContactPhone: student.emergency_contact_phone ?? "",
    notes: student.notes ?? "",
    classLevelId: student.class_level?.id ?? "",
    guardianName: student.guardian?.full_name ?? "",
    guardianEmail: student.guardian?.email ?? "",
    guardianPhone: student.guardian?.phone ?? "",
    hasGuardian: Boolean(student.guardian),
  };
}

function payload(draft: StudentDraft) {
  return {
    fullName: draft.fullName.trim(),
    email: draft.email.trim() || undefined,
    phone: draft.phone.trim() || undefined,
    birthDate: toIso(draft.birthDate),
    emergencyContactName: draft.emergencyContactName.trim() || undefined,
    emergencyContactPhone: draft.emergencyContactPhone.trim() || undefined,
    notes: draft.notes.trim() || undefined,
    classLevelId: draft.classLevelId || undefined,
    guardian: draft.hasGuardian
      ? {
          fullName: draft.guardianName.trim(),
          email: draft.guardianEmail.trim() || undefined,
          phone: draft.guardianPhone.trim() || undefined,
        }
      : undefined,
  };
}

function isPhone(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

function isDraftValid(draft: StudentDraft) {
  const withGuardian = draft.hasGuardian;
  const contactOk = withGuardian
    ? draft.guardianName.trim().length >= 2 && isValidEmail(draft.guardianEmail.trim()) && isPhone(draft.guardianPhone)
    : isValidEmail(draft.email.trim()) && isPhone(draft.phone);
  return (
    draft.fullName.trim().length >= 2 &&
    (!draft.email || isValidEmail(draft.email)) &&
    (!draft.birthDate || Boolean(toIso(draft.birthDate))) &&
    contactOk
  );
}

function StudentFields({ draft, setDraft, levels }: { draft: StudentDraft; setDraft: (draft: StudentDraft) => void; levels: Named[] }) {
  const { t } = useI18n();
  const form = t.students.form;
  const withGuardian = draft.hasGuardian;
  const [more, setMore] = useState(() => Boolean(draft.emergencyContactName || draft.emergencyContactPhone || draft.notes));
  const set = (key: keyof StudentDraft) => (value: string) => setDraft({ ...draft, [key]: value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label={form.fullName} value={draft.fullName} onChange={(event) => set("fullName")(event.target.value)} autoFocus />
      </div>
      <div className="sm:col-span-2">
        <Segmented
          label={form.contactOwner}
          value={draft.hasGuardian ? "guardian" : "self"}
          onChange={(value) => setDraft({ ...draft, hasGuardian: value === "guardian" })}
          options={[
            { value: "self", label: form.contactSelf },
            { value: "guardian", label: form.contactGuardian },
          ]}
        />
      </div>
      <Field
        label={form.email}
        type="email"
        inputMode="email"
        optional={withGuardian}
        value={draft.email}
        onChange={(event) => set("email")(event.target.value)}
        error={draft.email && !isValidEmail(draft.email) ? form.checkEmail : null}
      />
      <Field
        label={form.phone}
        inputMode="tel"
        optional={withGuardian}
        value={draft.phone}
        onChange={(event) => set("phone")(maskPhone(event.target.value))}
        placeholder={form.phonePlaceholder}
      />
      <Select
        label={form.level}
        optional
        value={draft.classLevelId}
        onChange={set("classLevelId")}
        options={[{ value: "", label: form.levelLater }, ...levels.map((level) => ({ value: level.id, label: level.name }))]}
      />
      <Field
        label={form.birthDate}
        inputMode="numeric"
        optional
        value={draft.birthDate}
        onChange={(event) => set("birthDate")(maskDate(event.target.value))}
        placeholder={form.birthDatePlaceholder}
      />
      {withGuardian ? (
        <fieldset className="grid gap-4 rounded-2xl border border-primary/30 bg-primary-soft p-4 sm:col-span-2 sm:grid-cols-2">
          <legend className="sr-only">{form.guardianTitle}</legend>
          <div className="grid gap-1 sm:col-span-2">
            <p className="font-semibold">{form.guardianTitle}</p>
            <p className="text-sm text-muted">{form.guardianText}</p>
          </div>
          <div className="sm:col-span-2">
            <Field label={form.guardianName} value={draft.guardianName} onChange={(event) => set("guardianName")(event.target.value)} />
          </div>
          <Field
            label={form.guardianEmail}
            type="email"
            inputMode="email"
            value={draft.guardianEmail}
            onChange={(event) => set("guardianEmail")(event.target.value)}
            error={draft.guardianEmail && !isValidEmail(draft.guardianEmail) ? form.checkEmail : null}
          />
          <Field
            label={form.guardianPhone}
            inputMode="tel"
            value={draft.guardianPhone}
            onChange={(event) => set("guardianPhone")(maskPhone(event.target.value))}
            placeholder={form.phonePlaceholder}
          />
        </fieldset>
      ) : null}
      {more ? (
        <>
          <Field
            label={form.emergencyName}
            optional
            value={draft.emergencyContactName}
            onChange={(event) => set("emergencyContactName")(event.target.value)}
            placeholder={form.emergencyNamePlaceholder}
          />
          <Field
            label={form.emergencyPhone}
            inputMode="tel"
            optional
            value={draft.emergencyContactPhone}
            onChange={(event) => set("emergencyContactPhone")(maskPhone(event.target.value))}
          />
          <div className="sm:col-span-2">
            <TextArea label={form.notes} optional value={draft.notes} onChange={(event) => set("notes")(event.target.value)} placeholder={form.notesPlaceholder} />
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setMore(true)} className="justify-self-start text-sm font-semibold text-primary hover:underline sm:col-span-2">
          {form.moreDetails}
        </button>
      )}
    </div>
  );
}

type CreateDialogProps = { open: boolean; orgId: string; levels: Named[]; onClose: () => void; onCreated: () => void };

export function StudentCreateDialog(props: CreateDialogProps) {
  return props.open ? <StudentCreateDialogBody {...props} /> : null;
}

function StudentCreateDialogBody({ open, orgId, levels, onClose, onCreated }: CreateDialogProps) {
  const { t } = useI18n();
  const toast = useToast();
  const [draft, setDraft] = useState<StudentDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isDraftValid(draft) || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api<{ access: AccessResult }>(`/api/v1/organizations/${orgId}/students`, { method: "POST", body: JSON.stringify(payload(draft)) });
      const email = draft.hasGuardian ? draft.guardianEmail.trim() : draft.email.trim();
      toast({
        message: t.access[created.access](draft.fullName.trim(), email),
        tone: created.access === "failed" ? "error" : undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={t.students.form.title}
      description={t.students.form.description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form="student-form" disabled={!isDraftValid(draft)} loading={saving}>
            {t.students.form.submit}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={submit} className="grid gap-4">
        <StudentFields draft={draft} setDraft={setDraft} levels={levels} />
        {error ? <InlineAlert tone="danger" title={error} /> : null}
      </form>
    </Dialog>
  );
}

type DetailDrawerProps = { orgId: string; student: Student | null; levels: Named[]; onClose: () => void; onChanged: () => void };

export function StudentDetailDrawer(props: DetailDrawerProps) {
  return <StudentDetailDrawerBody key={props.student?.id ?? "closed"} {...props} />;
}

function StudentDetailDrawerBody({ orgId, student, levels, onClose, onChanged }: DetailDrawerProps) {
  const { t, format } = useI18n();
  const { creditDays } = useOrg();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<"profile" | "credits">("profile");
  const [draft, setDraft] = useState<StudentDraft>(() => (student ? draftFrom(student) : EMPTY));
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const base = `/api/v1/organizations/${orgId}/students`;
  const credits = useApi<Credit[]>(student && tab === "credits" ? `${base}/${student.id}/credits` : null);
  const detail = t.students.detail;

  const dirty = student ? JSON.stringify(draft) !== JSON.stringify(draftFrom(student)) : false;
  const today = new Date().toISOString().slice(0, 10);
  const balance = (credits.data ?? []).filter((item) => !item.expires_at || item.expires_at >= today).reduce((sum, item) => sum + item.quantity, 0);

  const [granting, setGranting] = useState(false);

  async function grantAccess() {
    if (!student) return;
    setGranting(true);
    try {
      const result = await api<{ email: string; invited: boolean }>(`${base}/${student.id}/access`, { method: "POST" });
      toast({ message: result.invited ? detail.accessInvited(result.email) : detail.accessGranted(result.email) });
      onChanged();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setGranting(false);
    }
  }

  async function save() {
    if (!student || !isDraftValid(draft)) {
      return;
    }
    setSaving(true);
    try {
      await api(`${base}/${student.id}`, { method: "PATCH", body: JSON.stringify(payload(draft)) });
      toast({ message: detail.saved });
      onChanged();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function adjust(sign: 1 | -1) {
    if (!student) {
      return;
    }
    const giving = sign > 0;
    const ok = await confirm({
      title: giving ? detail.giveTitle : detail.removeTitle,
      description: giving ? detail.giveText(student.full_name, quantity, creditDays) : detail.removeText(student.full_name, quantity),
      confirmLabel: giving ? detail.give : detail.remove,
      tone: giving ? "default" : "danger",
    });
    if (!ok) {
      return;
    }
    const expires = new Date();
    expires.setDate(expires.getDate() + CREDIT_DAYS);
    try {
      await api(`${base}/${student.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          quantity: quantity * sign,
          kind: "makeup",
          reason: giving ? "staff_grant" : "staff_adjustment",
          expiresAt: giving ? expires.toISOString().slice(0, 10) : undefined,
        }),
      });
      toast({ message: giving ? detail.given : detail.removed });
      await credits.reload();
    } catch (err) {
      toast({ message: errorMessage(err, t), tone: "error" });
    }
  }

  function reasonText(credit: Credit) {
    if (credit.reason && detail.reasons[credit.reason]) return detail.reasons[credit.reason];
    if (credit.reason) return credit.reason;
    return credit.kind === "makeup" ? detail.reasons.makeup : detail.reasons.lesson;
  }

  return (
    <Drawer
      open={Boolean(student)}
      onClose={onClose}
      title={student?.full_name ?? ""}
      subtitle={
        student ? (
          <span className="flex items-center gap-2">
            {student.class_level ? <Badge tone="primary">{student.class_level.name}</Badge> : <Badge tone="neutral">{t.common.noLevel}</Badge>}
            {student.guardian ? (
              <span className="truncate">
                {t.students.form.guardianTitle}: {student.guardian.full_name}
              </span>
            ) : student.email ? (
              <span className="truncate">{student.email}</span>
            ) : null}
          </span>
        ) : null
      }
      footer={
        tab === "profile" ? (
          <>
            <Button variant="ghost" disabled={!dirty} onClick={() => student && setDraft(draftFrom(student))}>
              {t.common.discard}
            </Button>
            <Button onClick={save} disabled={!dirty || !isDraftValid(draft)} loading={saving}>
              {detail.save}
            </Button>
          </>
        ) : null
      }
    >
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          {student ? (
            <PhotoInput
              name={student.full_name}
              src={student.photo_url}
              onUpload={async (dataUrl) => {
                await api(`${base}/${student.id}/photo`, { method: "PUT", body: JSON.stringify({ dataUrl }) });
                onChanged();
              }}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{student?.full_name}</p>
            <p className="text-sm text-muted">{student?.phone ?? t.common.noPhone}</p>
          </div>
          {student ? (
            student.profile_id || student.guardian?.profile_id ? (
              <Badge tone="success">{detail.hasAccess}</Badge>
            ) : (
              <Button size="sm" variant="outline" loading={granting} onClick={() => void grantAccess()}>
                {detail.grantAccess}
              </Button>
            )
          ) : null}
        </div>
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "profile", label: detail.profile },
            { value: "credits", label: detail.credits },
          ]}
        />
        {tab === "profile" ? <StudentFields draft={draft} setDraft={setDraft} levels={levels} /> : null}
        {tab === "credits" ? (
          <div className="grid gap-5">
            <div className="grid gap-1 rounded-3xl border border-line bg-surface-2 p-5">
              <p className="text-sm text-muted">{detail.balance}</p>
              <p className="display tabular text-4xl font-semibold">{credits.loading ? t.common.empty : balance}</p>
              <p className="text-xs text-muted">{detail.balanceHint}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44">
                <Stepper label={detail.quantity} value={quantity} onChange={setQuantity} min={1} max={20} />
              </div>
              <Button variant="secondary" onClick={() => void adjust(1)}>
                <Plus className="h-4 w-4" />
                {detail.give}
              </Button>
              <Button variant="ghost" onClick={() => void adjust(-1)}>
                <Minus className="h-4 w-4" />
                {detail.remove}
              </Button>
            </div>
            {credits.loading ? <LoadingList rows={3} /> : null}
            {credits.error ? <ErrorState message={credits.error} onRetry={() => void credits.reload()} /> : null}
            <ul className="grid gap-1">
              {(credits.data ?? []).slice(0, 30).map((credit) => (
                <li key={credit.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-surface-2">
                  <span className={`tabular w-10 text-right font-semibold ${credit.quantity > 0 ? "text-success" : "text-muted"}`}>
                    {credit.quantity > 0 ? `+${credit.quantity}` : credit.quantity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{reasonText(credit)}</span>
                    <span className="text-xs text-muted">
                      {format.date(credit.created_at)}
                      {credit.expires_at ? ` · ${detail.validUntil(format.date(credit.expires_at))}` : ""}
                    </span>
                  </span>
                  {credit.kind === "makeup" ? <Badge tone="accent">{detail.makeupBadge}</Badge> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
