"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Calculator, Check, Minus, Plus } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { Dialog } from "@/components/overlay";
import { AnimatedLogo, LiveClassesDemo, Reveal } from "@/components/landing-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Segmented } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { PRICING } from "@/lib/plans";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { MemberTag, SaasPlan } from "@/lib/types";

const TEAM_TAGS: Array<Exclude<MemberTag, "student">> = ["manager", "teacher"];

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    void createBrowserSupabase()
      ?.auth.getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);
  return signedIn;
}

export default function LandingPage() {
  const { t } = useI18n();
  const copy = t.landing;
  const signedIn = useSignedIn();

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-bg/70 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-2 px-5 py-4 lg:px-10">
          <BrandMark />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <a href="#how-it-works" className="hidden rounded-full px-4 py-2 text-muted hover:text-ink md:block">
              {copy.howItWorks}
            </a>
            <a href="#pricing" className="hidden rounded-full px-4 py-2 text-muted hover:text-ink md:block">
              {copy.plans}
            </a>
            <span className="hidden sm:contents"><LanguageSwitch /></span>
            <span className="hidden sm:contents"><ThemeToggle /></span>
            {signedIn ? (
              <Link href={ROUTES.home} className="rounded-full bg-primary px-4 py-2 text-on-primary transition hover:bg-primary-hover">
                {copy.openApp}
              </Link>
            ) : (
              <>
                <Link href={ROUTES.login} className="rounded-full px-4 py-2 hover:bg-surface-2">
                  {copy.signIn}
                </Link>
                <Link href={ROUTES.signup} className="rounded-full bg-primary px-4 py-2 text-on-primary transition hover:bg-primary-hover">
                  {copy.start}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-8 pt-6 lg:grid-cols-[1.35fr_1fr] lg:pt-8">
          <div>
            <Reveal>
              <h1 className="display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-[3rem]">
                {copy.headline}
                <br />
                <span className="text-primary">{copy.headlineAccent}</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-lg text-lg text-muted">{copy.subhead}</p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={ROUTES.signup} className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-hover">
                  {copy.createSchool}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={signedIn ? ROUTES.home : ROUTES.login}
                  className="inline-flex h-12 items-center rounded-full border border-line bg-surface px-6 font-semibold transition hover:bg-surface-2"
                >
                  {signedIn ? copy.openApp : copy.haveAccount}
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="relative grid place-items-center">
            <AnimatedLogo size={320} label={copy.logoSwap} />
          </div>
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:items-center">
          <div className="grid gap-8">
            <Reveal>
              <h2 className="display text-3xl font-semibold md:text-4xl">{copy.stepsTitle}</h2>
            </Reveal>
            <ol className="grid gap-6">
              {copy.steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 100}>
                  <li className="flex gap-4">
                    <span className="display tabular w-6 shrink-0 text-lg font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-lg font-semibold">{step.title}</p>
                      <p className="mt-1 text-muted">{step.text}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </div>
          <Reveal delay={150}>
            <LiveClassesDemo />
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-10">
          <Reveal>
            <h2 className="display text-3xl font-semibold md:text-4xl">{copy.personasTitle}</h2>
          </Reveal>
          <dl className="mt-8 grid gap-8 md:grid-cols-3">
            {copy.personas.map((persona, index) => (
              <Reveal key={persona.title} delay={index * 100}>
                <div className="grid gap-2 border-t-2 border-primary pt-4">
                  <dt className="text-lg font-semibold">{persona.title}</dt>
                  <dd className="text-muted">{persona.text}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-5 py-10">
          <Reveal>
            <h2 className="display text-3xl font-semibold md:text-4xl">{copy.pricingTitle}</h2>
            <p className="mt-3 max-w-2xl text-muted">{copy.pricingText}</p>
          </Reveal>
          <Reveal delay={100}>
            <PricingCard />
          </Reveal>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-12 pt-6">
          <Reveal>
            <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-ink px-8 py-12 text-center text-bg">
              <h2 className="display max-w-xl text-4xl font-semibold">{copy.ctaTitle}</h2>
              <Link href={ROUTES.signup} className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-on-accent transition hover:brightness-95">
                {copy.createSchool}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted">
          <BrandMark />
          <div className="flex items-center gap-3">
            <LanguageSwitch className="sm:hidden" />
            <p>
              {copy.footer} © {new Date().getFullYear()} Turma Certa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard() {
  const { t, format } = useI18n();
  const copy = t.landing;
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<(typeof TEAM_TAGS)[number], number>>({ manager: 1, teacher: 3 });
  const [mode, setMode] = useState<SaasPlan>("school");
  const total = mode === "autonomous" ? PRICING.baseCents.autonomous : PRICING.baseCents.school + TEAM_TAGS.reduce((sum, tag) => sum + counts[tag] * PRICING.tagCents[tag], 0);

  function change(tag: (typeof TEAM_TAGS)[number], delta: number) {
    setCounts((current) => ({ ...current, [tag]: Math.min(99, Math.max(0, current[tag] + delta)) }));
  }

  return (
    <>
      <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-soft md:grid-cols-2">
        <div className="flex flex-col justify-center gap-6 p-8">
          <div>
            <p className="font-semibold">{copy.pricingBase}</p>
            <p className="mt-2">
              <span className="text-muted">R$ </span>
              <span className="display tabular text-5xl font-semibold">{PRICING.baseCents.school / 100}</span>
              <span className="text-muted">{copy.perMonth}</span>
            </p>
            <p className="mt-2 text-sm text-muted">{copy.autonomousPrice(format.currency(PRICING.baseCents.autonomous))}</p>
          </div>
          <ul className="grid gap-2">
            {copy.pricingIncluded.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid content-start gap-5 border-t border-line bg-surface-2 p-8 md:border-l md:border-t-0">
          <p className="font-semibold">{copy.teamTitle}</p>
          <dl className="grid gap-4">
            {TEAM_TAGS.map((tag) => (
              <div key={tag} className="grid gap-0.5 border-b border-line pb-4 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-semibold">{t.tags[tag]}</dt>
                  <dd className="tabular font-semibold">
                    {format.currency(PRICING.tagCents[tag])}
                    <span className="font-normal text-muted">{copy.perMonth}</span>
                  </dd>
                </div>
                <p className="text-sm text-muted">{copy.tagHints[tag]}</p>
              </div>
            ))}
          </dl>
          <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
            <Calculator className="h-4 w-4" />
            {copy.simulate}
          </Button>
        </div>
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.simulatorTitle}
        description={copy.simulatorHint}
        footer={
          <div className="flex w-full items-end justify-between gap-4">
            <div>
              <p className="font-semibold">{copy.simulatorTotal}</p>
              <p className="text-xs text-muted">{copy.ownerIncluded}</p>
            </div>
            <p className="shrink-0">
              <span className="display tabular text-3xl font-semibold" aria-live="polite">
                {format.currency(total)}
              </span>
              <span className="text-muted">{copy.perMonth}</span>
            </p>
          </div>
        }
      >
        <Segmented
          label={copy.simulatorMode}
          value={mode}
          onChange={setMode}
          options={[
            { value: "school", label: copy.modeSchool },
            { value: "autonomous", label: copy.modeAutonomous },
          ]}
        />
        {mode === "autonomous" ? (
          <p className="text-sm text-muted">{copy.autonomousHint}</p>
        ) : (
        <ul className="grid gap-4">
          {TEAM_TAGS.map((tag) => (
            <li key={tag} className="flex items-center justify-between gap-4 border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-semibold">{t.tags[tag]}</p>
                <p className="text-sm text-muted">{format.currency(counts[tag] * PRICING.tagCents[tag])}{copy.perMonth}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={copy.less(t.tags[tag])}
                  disabled={counts[tag] === 0}
                  onClick={() => change(tag, -1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface transition hover:border-primary/50 disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="tabular w-8 text-center font-semibold">{counts[tag]}</span>
                <button
                  type="button"
                  aria-label={copy.more(t.tags[tag])}
                  onClick={() => change(tag, 1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface transition hover:border-primary/50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        )}
      </Dialog>
    </>
  );
}
