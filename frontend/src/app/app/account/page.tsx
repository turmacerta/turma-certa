"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Languages, Laptop, LogOut, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { NewPasswordForm } from "@/components/new-password-form";
import { useOrg } from "@/components/org-provider";
import { Dialog, useConfirm, useToast } from "@/components/overlay";
import { Avatar, Badge, Button, Card, cn, CodeInput, Field, InlineAlert, MockBadge, PageHeader, PasswordField, Tabs } from "@/components/ui";
import { authErrorMessage, TOTP_LENGTH } from "@/lib/auth";
import { LOCALE_OPTIONS, useI18n } from "@/lib/i18n";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useTheme, type ThemePreference } from "@/lib/theme";

type Tab = "profile" | "security" | "preferences";

export default function AccountPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="grid max-w-3xl gap-6 animate-fade-up">
      <PageHeader eyebrow={t.account.eyebrow} title={t.account.title} description={t.account.description} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "profile", label: t.account.tabs.profile },
          { value: "security", label: t.account.tabs.security },
          { value: "preferences", label: t.account.tabs.preferences },
        ]}
      />
      {tab === "profile" ? <ProfileTab /> : null}
      {tab === "security" ? <SecurityTab /> : null}
      {tab === "preferences" ? <PreferencesTab /> : null}
    </div>
  );
}

function ProfileTab() {
  const { t } = useI18n();
  const toast = useToast();
  const { profile, memberships, refresh } = useOrg();
  const [name, setName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = name.trim() !== (profile?.full_name ?? "") && name.trim().length >= 2;

  async function save() {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSaving(false);
    if (error) {
      toast({ message: authErrorMessage(error, t), tone: "error" });
      return;
    }
    toast({ message: t.account.nameSaved, tone: "info" });
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={profile?.full_name ?? "?"} size="lg" />
          <div>
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-muted">{profile?.email}</p>
          </div>
        </div>
        <Field label={t.account.fullName} value={name} onChange={(event) => setName(event.target.value)} />
        <Field label={t.account.email} value={profile?.email ?? ""} disabled hint={t.account.emailHint} />
        <div className="flex justify-end">
          <Button disabled={!dirty} loading={saving} onClick={save}>
            {t.common.save}
          </Button>
        </div>
      </Card>
      <Card className="grid gap-3">
        <h2 className="font-semibold">{t.account.yourSchools}</h2>
        <ul className="grid gap-2">
          {memberships.map((membership) => (
            <li key={membership.organization.id} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3">
              <span className="font-medium">{membership.organization.name}</span>
              <Badge tone="neutral">{t.roles[membership.role]}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

type Factor = { id: string; status: string };

function SecurityTab() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { profile } = useOrg();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStep, setPasswordStep] = useState<"closed" | "verify" | "new">("closed");
  const [currentPassword, setCurrentPassword] = useState("");

  const fetchFactors = useCallback(async () => {
    const { data } = (await createBrowserSupabase()?.auth.mfa.listFactors()) ?? { data: null };
    return ((data?.totp ?? []) as Factor[]).filter((factor) => factor.status === "verified");
  }, []);

  useEffect(() => {
    fetchFactors().then(setFactors);
  }, [fetchFactors]);

  async function startEnroll() {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Turma Certa ${Date.now()}` });
    setBusy(false);
    if (enrollError || !data) {
      toast({ message: authErrorMessage(enrollError, t), tone: "error" });
      return;
    }
    setCode("");
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll(value: string) {
    const supabase = createBrowserSupabase();
    if (!supabase || !enrolling) return;
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrolling.id, code: value });
    setBusy(false);
    if (verifyError) {
      setCode("");
      setError(authErrorMessage(verifyError, t));
      return;
    }
    setEnrolling(null);
    toast({ message: t.account.enabled });
    setFactors(await fetchFactors());
  }

  async function disable(factor: Factor) {
    const ok = await confirm({
      title: t.account.disableTitle,
      description: t.account.disableText,
      confirmLabel: t.account.disable,
      tone: "danger",
      typeToConfirm: t.account.disableWord,
    });
    if (!ok) return;
    const { error: unenrollError } = (await createBrowserSupabase()?.auth.mfa.unenroll({ factorId: factor.id })) ?? { error: null };
    if (unenrollError) {
      toast({ message: authErrorMessage(unenrollError, t), tone: "error" });
      return;
    }
    toast({ message: t.account.disabled });
    setFactors(await fetchFactors());
  }

  async function verifyCurrentPassword(event: React.FormEvent) {
    event.preventDefault();
    const supabase = createBrowserSupabase();
    if (!supabase || !profile?.email || !currentPassword) return;
    setBusy(true);
    const { error: signError } = await supabase.auth.signInWithPassword({ email: profile.email, password: currentPassword });
    setBusy(false);
    if (signError) {
      toast({ message: t.account.wrongPassword, tone: "error" });
      return;
    }
    setPasswordStep("new");
  }

  async function signOutOthers() {
    const ok = await confirm({ title: t.account.signOutOthersTitle, description: t.account.signOutOthersText, confirmLabel: t.account.signOutOthers });
    if (!ok) return;
    await createBrowserSupabase()?.auth.signOut({ scope: "others" });
    toast({ message: t.account.signedOutOthers });
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: t.account.deleteTitle,
      description: t.account.deleteConfirmText,
      confirmLabel: t.account.deleteAccount,
      tone: "danger",
      typeToConfirm: t.account.deleteWord,
    });
    if (ok) {
      toast({ message: t.account.deleteMissing, tone: "info" });
    }
  }

  function closePassword() {
    setPasswordStep("closed");
    setCurrentPassword("");
  }

  const active = factors[0];

  return (
    <div className="grid gap-4">
      <SettingRow title={t.account.password} text={t.account.passwordText}>
        <Button variant="outline" onClick={() => setPasswordStep("verify")}>
          {t.account.changePassword}
        </Button>
      </SettingRow>

      <SettingRow
        icon={<ShieldCheck className="h-5 w-5" />}
        title={
          <>
            {t.account.twoFactor} {active ? <Badge tone="success">{t.account.active}</Badge> : <Badge tone="neutral">{t.account.inactive}</Badge>}
          </>
        }
        text={t.account.twoFactorText}
      >
        {active ? (
          <Button variant="ghost" onClick={() => void disable(active)}>
            {t.account.disable}
          </Button>
        ) : (
          <Button onClick={startEnroll} loading={busy && !enrolling}>
            {t.account.enable}
          </Button>
        )}
      </SettingRow>

      <SettingRow icon={<Laptop className="h-5 w-5" />} title={t.account.devices} text={t.account.devicesText}>
        <Button variant="outline" onClick={signOutOthers}>
          <LogOut className="h-4 w-4" />
          {t.account.signOutOthers}
        </Button>
      </SettingRow>

      <SettingRow
        danger
        title={
          <>
            {t.account.deleteAccount} <MockBadge />
          </>
        }
        text={t.account.deleteText}
      >
        <Button variant="ghost" className="text-danger" onClick={deleteAccount}>
          <Trash2 className="h-4 w-4" />
          {t.account.delete}
        </Button>
      </SettingRow>

      <Dialog open={Boolean(enrolling)} onClose={() => setEnrolling(null)} title={t.account.enrollTitle} description={t.account.enrollText}>
        {enrolling ? (
          <div className="grid justify-items-center gap-5">
            <div
              role="img"
              aria-label={t.account.qrAlt}
              className="h-50 w-50 rounded-3xl bg-white bg-[length:176px] bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${enrolling.qr}")` }}
            />
            <p className="text-center text-xs text-muted">
              {t.account.noCamera} <span className="tabular select-all font-semibold text-ink">{enrolling.secret}</span>
            </p>
            <CodeInput length={TOTP_LENGTH} value={code} onChange={setCode} onComplete={confirmEnroll} disabled={busy} label={t.account.codeLabel} />
            {error ? <InlineAlert tone="danger" title={error} /> : null}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={passwordStep !== "closed"}
        onClose={closePassword}
        title={t.account.changePasswordTitle}
        description={passwordStep === "verify" ? t.account.verifyCurrent : t.account.chooseNew}
      >
        {passwordStep === "verify" ? (
          <form onSubmit={verifyCurrentPassword} className="grid gap-4">
            <PasswordField label={t.account.currentPassword} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoFocus />
            <Button type="submit" block disabled={!currentPassword} loading={busy}>
              {t.common.continue}
            </Button>
          </form>
        ) : null}
        {passwordStep === "new" ? (
          <NewPasswordForm
            onDone={() => {
              closePassword();
              toast({ message: t.account.passwordChanged });
              router.refresh();
            }}
          />
        ) : null}
      </Dialog>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  text,
  danger,
  children,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  text: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-wrap items-center justify-between gap-4", danger && "border-danger/30")}>
      <div className="flex min-w-0 flex-1 gap-3">
        {icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-surface-2">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">{title}</h2>
          <p className="text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function PreferencesTab() {
  const { t, locale, setLocale } = useI18n();
  const { preference, setPreference } = useTheme();
  const themes: Array<{ value: ThemePreference; icon: typeof Sun }> = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ];
  return (
    <div className="grid gap-4">
      <Card className="grid gap-4">
        <h2 className="font-semibold">{t.account.appearance}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {themes.map((option) => (
            <ChoiceButton key={option.value} active={preference === option.value} onClick={() => setPreference(option.value)}>
              <option.icon className="h-5 w-5" />
              {t.account.themes[option.value]}
            </ChoiceButton>
          ))}
        </div>
      </Card>
      <Card className="grid gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Languages className="h-4 w-4" />
            {t.account.language}
          </h2>
          <p className="text-sm text-muted">{t.account.languageText}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOCALE_OPTIONS.map((option) => (
            <ChoiceButton key={option.value} active={locale === option.value} onClick={() => setLocale(option.value)}>
              <span className="grid h-7 w-9 place-items-center rounded-lg bg-surface-2 text-xs font-bold">{option.label}</span>
              {option.name}
            </ChoiceButton>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-4 text-left text-sm font-semibold transition",
        active ? "border-primary bg-primary-soft" : "border-line hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}
