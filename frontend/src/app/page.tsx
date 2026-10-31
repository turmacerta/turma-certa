"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { LanguageSwitch } from "@/components/language-switch";
import { AnimatedLogo, LiveClassesDemo, Reveal, SportsMarquee } from "@/components/landing-motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";

const PRICES = ["79", "189"];

export default function LandingPage() {
  const { t } = useI18n();
  const copy = t.landing;

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="sticky top-0 z-30 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-5 py-4">
          <BrandMark />
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <a href="#how-it-works" className="hidden rounded-full px-4 py-2 text-muted hover:text-ink md:block">
              {copy.howItWorks}
            </a>
            <a href="#pricing" className="hidden rounded-full px-4 py-2 text-muted hover:text-ink md:block">
              {copy.plans}
            </a>
            <LanguageSwitch className="hidden sm:inline-flex" />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href={ROUTES.login} className="rounded-full px-4 py-2 hover:bg-surface-2">
              {copy.signIn}
            </Link>
            <Link href={ROUTES.signup} className="rounded-full bg-primary px-4 py-2 text-on-primary transition hover:bg-primary-hover">
              {copy.start}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {copy.badge}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="display mt-6 text-5xl font-semibold leading-[1.03] sm:text-6xl">
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
                <Link href={ROUTES.login} className="inline-flex h-12 items-center rounded-full border border-line bg-surface px-6 font-semibold transition hover:bg-surface-2">
                  {copy.haveAccount}
                </Link>
              </div>
            </Reveal>
          </div>
          <div className="relative grid place-items-center">
            <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
            <AnimatedLogo size={360} />
          </div>
        </section>

        <section className="pb-20">
          <SportsMarquee />
        </section>

        <section id="how-it-works" className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2 lg:items-center">
          <div className="grid gap-8">
            <Reveal>
              <h2 className="display text-4xl font-semibold">{copy.stepsTitle}</h2>
            </Reveal>
            <ol className="grid gap-6">
              {copy.steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 100}>
                  <li className="flex gap-4">
                    <span className="display tabular grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-sm font-semibold">
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

        <section className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <div className="grid gap-8 rounded-[2rem] border border-line bg-surface p-8 md:grid-cols-3 md:p-12">
              {copy.personas.map((persona) => (
                <div key={persona.title}>
                  <p className="text-sm font-semibold text-muted">{persona.title}</p>
                  <p className="mt-2 text-lg">{persona.text}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
          <Reveal>
            <h2 className="display text-center text-4xl font-semibold">{copy.pricingTitle}</h2>
            <p className="mt-3 text-center text-muted">{copy.pricingText}</p>
          </Reveal>
          <div className="mx-auto mt-12 grid max-w-3xl gap-4 md:grid-cols-2">
            {copy.pricing.map((plan, index) => {
              const featured = index === 1;
              return (
                <Reveal key={plan.name} delay={index * 120}>
                  <div className={`grid h-full gap-6 rounded-[2rem] border bg-surface p-8 ${featured ? "border-primary shadow-soft" : "border-line"}`}>
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="mt-1 text-sm text-muted">{plan.who}</p>
                    </div>
                    <p>
                      <span className="text-muted">R$ </span>
                      <span className="display tabular text-5xl font-semibold">{PRICES[index]}</span>
                      <span className="text-muted">{copy.perMonth}</span>
                    </p>
                    <ul className="grid gap-2 text-sm">
                      {plan.items.map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={ROUTES.signup}
                      className={`inline-flex h-11 items-center justify-center rounded-full font-semibold transition ${featured ? "bg-primary text-on-primary hover:bg-primary-hover" : "border border-line hover:bg-surface-2"}`}
                    >
                      {copy.start}
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24">
          <Reveal>
            <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-ink px-8 py-16 text-center text-bg">
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
