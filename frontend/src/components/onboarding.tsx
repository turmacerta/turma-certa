"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Check, GraduationCap, LogOut, Mail, User } from "lucide-react";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { weekdayShort } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { PRICING } from "@/lib/plans";
import { SPORTS, SportIcon } from "@/lib/sports";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Profile, SaasPlan } from "@/lib/types";
import { BrandMark, LogoMark } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { ThemeToggle } from "./theme-toggle";
import { Button, cn, Field, InlineAlert, Stepper, TimeSelect } from "./ui";

const TOTAL_STEPS = 5;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

type Path = "owner" | "member";
type Created = { orgName: string; className: string; sessions: Array<{ id: string; starts_at: string }>; capacity: number };

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function toCents(value: string) {
  const number = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0;
}

export function Onboarding({
  profile,
  isPlatformAdmin,
  onCreated,
}: {
  profile: Profile | null;
  isPlatformAdmin: boolean;
  onCreated: () => Promise<void>;
}) {
  const { t, locale, format } = useI18n();
  const router = useRouter();
  const [path, setPath] = useState<Path | null>(null);
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<SaasPlan>("school");
  const [name, setName] = useState("");
  const [sports, setSports] = useState<string[]>([]);
  const [customSport, setCustomSport] = useState("");
  const [classSport, setClassSport] = useState("");
  const [classLevel, setClassLevel] = useState(0);
  const [days, setDays] = useState<number[]>([2, 4]);
  const [startsAt, setStartsAt] = useState("18:00");
  const [capacity, setCapacity] = useState(8);
  const [studentsCount, setStudentsCount] = useState(40);
  const [fee, setFee] = useState("250");
  const [courtsCount, setCourtsCount] = useState(2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [leaving, setLeaving] = useState(false);

  const ob = t.onboarding;
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const suggestions = SPORTS.filter((sport) => sport.key !== "other").map((sport) => t.sports[sport.key]);
  const sportForClass = sports.includes(classSport) ? classSport : (sports[0] ?? "");
  const feeCents = toCents(fee);

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

  function toggleDay(day: number) {
    setDays((items) => (items.includes(day) ? items.filter((item) => item !== day) : [...items, day]));
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
      let classSportId = "";
      let classLevelId = "";
      for (const sport of sports) {
        const row = await api<{ id: string }>(`${base}/sports`, { method: "POST", body: JSON.stringify({ name: sport }) });
        for (const [rank, level] of ob.defaultLevels.entries()) {
          const levelRow = await api<{ id: string }>(`${base}/levels`, { method: "POST", body: JSON.stringify({ name: level, rank, sportId: row.id }) });
          if (sport === sportForClass && rank === classLevel) classLevelId = levelRow.id;
        }
        if (sport === sportForClass) classSportId = row.id;
      }
      const unit = await api<{ id: string }>(`${base}/units`, {
        method: "POST",
        body: JSON.stringify({ name: plan === "school" ? ob.mainUnit : ob.soloUnit }),
      });
      let spaceId: string | undefined;
      for (let index = 1; index <= (plan === "school" ? courtsCount : 1); index += 1) {
        const space = await api<{ id: string }>(`${base}/units/${unit.id}/spaces`, { method: "POST", body: JSON.stringify({ name: ob.courtName(index) }) });
        spaceId ??= space.id;
      }
      const className = `${sportForClass} · ${ob.defaultLevels[classLevel]}`;
      const classRow = await api<{ id: string }>(`${base}/classes`, {
        method: "POST",
        body: JSON.stringify({
          name: className,
          sportId: classSportId,
          classLevelId: classLevelId || undefined,
          unitId: unit.id,
          spaceId,
          maxCapacity: capacity,
          schedules: days.map((weekday) => ({ weekday, startsAt, endsAt: addMinutes(startsAt, 60) })),
        }),
      });
      const now = new Date();
      const until = new Date(now);
      until.setDate(until.getDate() + 60);
      const sessions = await api<Array<{ id: string; starts_at: string; class_group?: { id: string } | null }>>(
        `${base}/schedule?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(until.toISOString())}`,
      );
      setCreated({
        orgName: name.trim(),
        className,
        sessions: sessions.filter((session) => session.class_group?.id === classRow.id),
        capacity,
      });
    } catch (err) {
      setError(errorMessage(err, t) || ob.createFailed);
    } finally {
      setSaving(false);
    }
  }

  async function enter(target: string) {
    setLeaving(true);
    await onCreated();
    router.replace(target);
  }

  async function signOut() {
    await createBrowserSupabase()?.auth.signOut();
    router.replace(`${ROUTES.login}?notice=signed-out`);
  }

  const canAdvance =
    step === 1 ? true : step === 2 ? name.trim().length >= 2 : step === 3 ? sports.length > 0 : step === 4 ? days.length > 0 : feeCents > 0;

  return (
    <div className="min-h-screen px-5 py-6">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        <BrandMark />
        <div className="flex items-center gap-2">
          <span className="hidden sm:contents">
            <LanguageSwitch />
          </span>
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t.common.signOut}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-2xl animate-fade-up">
        {created ? (
          <div className="grid gap-6">
            <div className="grid justify-items-center gap-3 text-center">
              <LogoMark animated className="h-20 w-20" />
              <h1 className="display text-3xl font-semibold md:text-4xl">{ob.doneTitle(created.orgName)}</h1>
              <p className="max-w-md text-muted">{ob.doneText(created.sessions.length)}</p>
            </div>

            <div className="grid gap-3 rounded-3xl border border-line bg-surface p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{created.className}</p>
                <span className="text-sm text-muted">{ob.capacityLabel(created.capacity)}</span>
              </div>
              <ul className="grid gap-2">
                {created.sessions.slice(0, 3).map((session) => (
                  <li key={session.id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                    <span className="font-medium first-letter:uppercase">{format.longDate(session.starts_at)}</span>
                    <span className="tabular font-semibold">{format.time(session.starts_at)}</span>
                  </li>
                ))}
              </ul>
              {created.sessions.length > 3 ? <p className="text-xs text-muted">{ob.moreLessons(created.sessions.length - 3)}</p> : null}
            </div>

            <div className="grid gap-4 rounded-3xl bg-ink p-6 text-bg">
              <p className="text-sm font-semibold opacity-80">{ob.moneyTitle}</p>
              <p className="display text-2xl font-semibold leading-snug md:text-3xl">{ob.moneyHeadline(format.currency(created.capacity * feeCents))}</p>
              <dl className="grid gap-2 border-t border-bg/15 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="opacity-80">{ob.moneyPerSeat}</dt>
                  <dd className="tabular font-semibold">{format.currency(feeCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="opacity-80">{ob.moneyToday(studentsCount)}</dt>
                  <dd className="tabular font-semibold">{format.currency(studentsCount * feeCents)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="opacity-80">{ob.moneyCost}</dt>
                  <dd className="tabular font-semibold">{format.currency(PRICING.baseCents[plan])}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" loading={leaving} onClick={() => void enter(`${ROUTES.students}?new=1`)}>
                {ob.addStudents}
              </Button>
              <Button size="lg" variant="outline" disabled={leaving} onClick={() => void enter(ROUTES.schedule)}>
                {ob.seeSchedule}
              </Button>
            </div>
          </div>
        ) : null}

        {!created && path === null ? (
          <>
            <h1 className="display text-4xl font-semibold">
              {ob.hello(firstName)} {ob.howWillYouUse}
            </h1>
            <p className="mt-2 text-muted">{ob.howHint}</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <ChoiceCard icon={<Building2 className="h-6 w-6" />} title={ob.ownerTitle} text={ob.ownerText} onClick={() => setPath("owner")} />
              <ChoiceCard icon={<GraduationCap className="h-6 w-6" />} title={ob.memberTitle} text={ob.memberText} onClick={() => setPath("member")} />
            </div>
            {isPlatformAdmin ? (
              <p className="mt-6 text-sm">
                <Link href={ROUTES.admin} className="font-bold text-primary hover:underline">
                  {ob.goToBackoffice}
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {!created && path === "member" ? (
          <div className="grid justify-items-center gap-6 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl bg-primary-soft text-primary">
              <Mail className="h-8 w-8" />
            </div>
            <div>
              <h1 className="display text-3xl font-semibold">{ob.waitingTitle}</h1>
              <p className="mx-auto mt-2 max-w-md text-muted">
                {ob.waitingTextPrefix} <span className="font-semibold text-ink">{profile?.email}</span>. {ob.waitingTextSuffix}
              </p>
            </div>
            <Button variant="outline" onClick={() => setPath(null)}>
              {t.common.back}
            </Button>
          </div>
        ) : null}

        {!created && path === "owner" ? (
          <div className="grid gap-8">
            <div className="flex items-center gap-2" aria-label={t.auth.stepOf(step, TOTAL_STEPS)}>
              {Array.from({ length: TOTAL_STEPS }, (_, index) => (
                <span key={index} className={cn("h-1.5 flex-1 rounded-full transition", index < step ? "bg-primary" : "bg-line")} />
              ))}
            </div>

            {step === 1 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{ob.sizeTitle}</h1>
                  <p className="mt-2 text-muted">{ob.sizeHint}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ChoiceCard selected={plan === "autonomous"} icon={<User className="h-6 w-6" />} title={ob.autonomousTitle} text={ob.autonomousText} onClick={() => setPlan("autonomous")} />
                  <ChoiceCard selected={plan === "school"} icon={<Building2 className="h-6 w-6" />} title={ob.schoolTitle} text={ob.schoolText} onClick={() => setPlan("school")} />
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{plan === "school" ? ob.nameSchoolTitle : ob.nameAutonomousTitle}</h1>
                  <p className="mt-2 text-muted">{ob.nameHint}</p>
                </div>
                <Field
                  label={plan === "school" ? ob.nameSchoolLabel : ob.nameAutonomousLabel}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={plan === "school" ? ob.nameSchoolPlaceholder : ob.nameAutonomousPlaceholder}
                  autoFocus
                />
              </section>
            ) : null}

            {step === 3 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{ob.sportsTitle}</h1>
                  <p className="mt-2 text-muted">{ob.sportsHint}</p>
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
                    <Field label={ob.otherSport} optional value={customSport} onChange={(event) => setCustomSport(event.target.value)} placeholder={ob.otherSportPlaceholder} />
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
                  <h1 className="display text-3xl font-semibold">{ob.classTitle}</h1>
                  <p className="mt-2 text-muted">{ob.classHint}</p>
                </div>
                {sports.length > 1 ? (
                  <ChipGroup label={ob.classSport} options={sports.map((sport) => ({ value: sport, label: sport }))} value={sportForClass} onChange={setClassSport} />
                ) : null}
                <ChipGroup
                  label={ob.classLevel}
                  options={ob.defaultLevels.map((level, index) => ({ value: String(index), label: level }))}
                  value={String(classLevel)}
                  onChange={(value) => setClassLevel(Number(value))}
                />
                <div className="grid gap-2">
                  <p className="text-sm font-semibold">{ob.classDays}</p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={days.includes(day)}
                        onClick={() => toggleDay(day)}
                        className={cn(
                          "h-10 w-14 rounded-full border text-sm font-semibold capitalize transition",
                          days.includes(day) ? "border-primary bg-primary text-on-primary" : "border-line bg-surface hover:border-primary/50",
                        )}
                      >
                        {weekdayShort(day, locale)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TimeSelect label={ob.classTime} value={startsAt} onChange={setStartsAt} />
                  <Stepper label={ob.classCapacity} value={capacity} onChange={setCapacity} min={1} max={40} suffix={ob.suffixStudents} />
                </div>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="grid gap-6">
                <div>
                  <h1 className="display text-3xl font-semibold">{ob.moneyStepTitle}</h1>
                  <p className="mt-2 text-muted">{ob.moneyStepHint}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Stepper label={ob.activeStudents} value={studentsCount} onChange={setStudentsCount} min={0} max={2000} step={5} suffix={ob.suffixStudents} />
                  <Field label={ob.averageFee} inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} placeholder="250" />
                  {plan === "school" ? <Stepper label={ob.courts} value={courtsCount} onChange={setCourtsCount} min={1} max={30} suffix={ob.suffixSpaces} /> : null}
                </div>
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
                <Button size="lg" loading={saving} disabled={!canAdvance} onClick={() => void finish()}>
                  {saving ? ob.creating : plan === "school" ? ob.createSchool : ob.start}
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function ChipGroup({ label, options, value, onChange }: { label: string; options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-semibold transition",
              option.value === value ? "border-primary bg-primary-soft text-ink" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
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
