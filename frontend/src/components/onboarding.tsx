"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Check, GraduationCap, LogOut, Mail, User } from "lucide-react";
import { api } from "@/lib/api";
import { writeStorage } from "@/lib/client-store";
import { errorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { SPORTS, SportIcon } from "@/lib/sports";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Profile, SaasPlan } from "@/lib/types";
import { BrandMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { useToast } from "./overlay";
import { ThemeToggle } from "./theme-toggle";
import { Button, cn, Field, InlineAlert, Stepper } from "./ui";

const SIZE_KEY = "tc-onboarding-size";
const TOTAL_STEPS = 4;

type Path = "owner" | "member";

export function Onboarding({
  profile,
  isPlatformAdmin,
  onCreated,
}: {
  profile: Profile | null;
  isPlatformAdmin: boolean;
  onCreated: () => Promise<void>;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [path, setPath] = useState<Path | null>(null);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<SaasPlan>("school");
  const [name, setName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [customSport, setCustomSport] = useState("");
  const [studentsCount, setStudentsCount] = useState(40);
  const [classesCount, setClassesCount] = useState(8);
  const [courtsCount, setCourtsCount] = useState(2);
  const [teachersCount, setTeachersCount] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const suggestions = SPORTS.filter((sport) => sport.key !== "other").map((sport) => t.sports[sport.key]);

  function toggleSport(sport: string) {
    setSports((items) => (items.includes(sport) ? items.filter((item) => item !== sport) : [...items, sport]));
  }

  function addCustomSport() {
    const value = customSport.trim();
    if (value.length >= 2 && !sports.includes(value)) {
      setSports((items) => [...items, value]);
    }
    setCustomSport("");
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const organization = await api<{ id: string }>("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), saasPlan: plan }),
      });
      const base = `/api/v1/organizations/${organization.id}`;
      for (const sport of sports) {
        await api(`${base}/sports`, { method: "POST", body: JSON.stringify({ name: sport }) });
      }
      for (const [rank, level] of t.onboarding.defaultLevels.entries()) {
        await api(`${base}/levels`, { method: "POST", body: JSON.stringify({ name: level, rank }) });
      }
      const unit = await api<{ id: string }>(`${base}/units`, {
        method: "POST",
        body: JSON.stringify({ name: plan === "school" ? t.onboarding.mainUnit : t.onboarding.soloUnit }),
      });
      for (let index = 1; index <= courtsCount; index += 1) {
        await api(`${base}/units/${unit.id}/spaces`, { method: "POST", body: JSON.stringify({ name: t.onboarding.courtName(index) }) });
      }
      writeStorage(
        SIZE_KEY,
        JSON.stringify({ orgId: organization.id, students: studentsCount, classes: classesCount, teachers: teachersCount, courts: courtsCount }),
      );
      toast({ message: t.onboarding.live(name.trim()) });
      await onCreated();
      router.replace(`${ROUTES.home}?welcome=1`);
    } catch (err) {
      setError(errorMessage(err, t) || t.onboarding.createFailed);
      setSaving(false);
    }
  }

  async function signOut() {
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  const canAdvance = step === 1 ? true : step === 2 ? name.trim().length >= 2 : step === 3 ? sports.length > 0 : true;

  return (
    <div className="min-h-screen px-5 py-6">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <BrandMark />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            {t.common.signOut}
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-12 max-w-2xl animate-fade-up">
        {path === null ? (
          <>
            <h1 className="display text-4xl font-semibold">
              {t.onboarding.hello(firstName)} {t.onboarding.howWillYouUse}
            </h1>
            <p className="mt-2 text-muted">{t.onboarding.howHint}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ChoiceCard icon={<Building2 className="h-6 w-6" />} title={t.onboarding.ownerTitle} text={t.onboarding.ownerText} onClick={() => setPath("owner")} />
              <ChoiceCard icon={<GraduationCap className="h-6 w-6" />} title={t.onboarding.memberTitle} text={t.onboarding.memberText} onClick={() => setPath("member")} />
            </div>
            {isPlatformAdmin ? (
              <p className="mt-6 text-sm">
                <Link href={ROUTES.admin} className="font-bold text-primary hover:underline">
                  {t.onboarding.goToBackoffice}
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {path === "member" ? (
          <div className="grid gap-6">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
              <Mail className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h1 className="display text-3xl font-semibold">{t.onboarding.waitingTitle}</h1>
              <p className="mx-auto mt-2 max-w-md text-muted">
                {t.onboarding.waitingTextPrefix} <span className="font-semibold text-ink">{profile?.email}</span>. {t.onboarding.waitingTextSuffix}
              </p>
            </div>
            <InlineAlert tone="warning" title={t.onboarding.inviteMissingTitle}>
              {t.onboarding.inviteMissingText}
            </InlineAlert>
            <Button variant="outline" onClick={() => setPath(null)} className="justify-self-center">
              {t.common.back}
            </Button>
          </div>
        ) : null}

        {path === "owner" ? (
          <div className="grid gap-8">
            <div className="flex items-center gap-2" aria-label={t.auth.stepOf(step, TOTAL_STEPS)}>
              {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                <span key={index} className={cn("h-1.5 flex-1 rounded-full transition", index < step ? "bg-primary" : "bg-line")} />
              ))}
            </div>

            {step === 1 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{t.onboarding.sizeTitle}</h1>
                  <p className="mt-2 text-muted">{t.onboarding.sizeHint}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceCard
                    selected={plan === "autonomous"}
                    icon={<User className="h-6 w-6" />}
                    title={t.onboarding.autonomousTitle}
                    text={t.onboarding.autonomousText}
                    onClick={() => setPlan("autonomous")}
                  />
                  <ChoiceCard
                    selected={plan === "school"}
                    icon={<Building2 className="h-6 w-6" />}
                    title={t.onboarding.schoolTitle}
                    text={t.onboarding.schoolText}
                    onClick={() => setPlan("school")}
                  />
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{plan === "school" ? t.onboarding.nameSchoolTitle : t.onboarding.nameAutonomousTitle}</h1>
                  <p className="mt-2 text-muted">{t.onboarding.nameHint}</p>
                </div>
                <Field
                  label={plan === "school" ? t.onboarding.nameSchoolLabel : t.onboarding.nameAutonomousLabel}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={plan === "school" ? t.onboarding.nameSchoolPlaceholder : t.onboarding.nameAutonomousPlaceholder}
                  autoFocus
                />
              </section>
            ) : null}

            {step === 3 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{t.onboarding.sportsTitle}</h1>
                  <p className="mt-2 text-muted">{t.onboarding.sportsHint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[...suggestions, ...sports.filter((item) => !suggestions.includes(item))].map((sport) => {
                    const active = sports.includes(sport);
                    return (
                      <button
                        key={sport}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleSport(sport)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                          active ? "border-primary bg-primary-soft text-ink" : "border-line bg-surface hover:border-primary/50",
                        )}
                      >
                        {active ? <Check className="h-4 w-4 text-primary" /> : <SportIcon name={sport} className="h-4 w-4" />}
                        {sport}
                      </button>
                    );
                  })}
                </div>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addCustomSport();
                  }}
                >
                  <div className="flex-1">
                    <Field label={t.onboarding.otherSport} value={customSport} onChange={(event) => setCustomSport(event.target.value)} placeholder={t.onboarding.otherSportPlaceholder} />
                  </div>
                  <Button type="submit" variant="outline" disabled={customSport.trim().length < 2}>
                    {t.common.add}
                  </Button>
                </form>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{t.onboarding.operationTitle}</h1>
                  <p className="mt-2 text-muted">{t.onboarding.operationHint}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Stepper label={t.onboarding.activeStudents} value={studentsCount} onChange={setStudentsCount} min={0} max={2000} step={5} suffix={t.onboarding.suffixStudents} />
                  <Stepper label={t.onboarding.weeklyClasses} value={classesCount} onChange={setClassesCount} min={0} max={300} suffix={t.onboarding.suffixClasses} />
                  <Stepper label={t.onboarding.courts} value={courtsCount} onChange={setCourtsCount} min={1} max={30} suffix={t.onboarding.suffixSpaces} />
                  {plan === "school" ? (
                    <Stepper label={t.onboarding.teachers} value={teachersCount} onChange={setTeachersCount} min={1} max={100} suffix={t.onboarding.suffixPeople} />
                  ) : null}
                </div>
                {studentsCount > 0 && classesCount > 0 ? (
                  <p className="rounded-2xl bg-surface-2 p-4 text-sm text-muted">
                    {t.onboarding.averagePrefix}{" "}
                    <span className="font-semibold text-ink">{t.onboarding.averageValue(Math.round(studentsCount / classesCount))}</span>. {t.onboarding.courtsCreated(courtsCount)}
                  </p>
                ) : null}
                {error ? <InlineAlert tone="danger" title={error} /> : null}
              </section>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => (step === 1 ? setPath(null) : setStep(step - 1))} disabled={saving}>
                {t.common.back}
              </Button>
              {step < TOTAL_STEPS ? (
                <Button size="lg" disabled={!canAdvance} onClick={() => setStep(step + 1)}>
                  {t.common.continue}
                </Button>
              ) : (
                <Button size="lg" loading={saving} onClick={finish}>
                  {saving ? t.onboarding.creating : plan === "school" ? t.onboarding.createSchool : t.onboarding.start}
                </Button>
              )}
            </div>
            {step === 3 && !canAdvance ? <p className="-mt-6 text-right text-xs text-muted">{t.onboarding.pickSport}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  text,
  onClick,
  selected,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "grid gap-3 rounded-3xl border bg-surface p-6 text-left shadow-soft transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        selected ? "border-primary ring-4 ring-ring" : "border-line hover:border-primary/40",
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary">{icon}</span>
      <span className="display text-xl font-semibold">{title}</span>
      <span className="text-sm text-muted">{text}</span>
    </button>
  );
}
