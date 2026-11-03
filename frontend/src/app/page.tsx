"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { AnimatedLogo, LiveClassesDemo, Reveal } from "@/components/landing-motion";
import { Preferences } from "@/components/preferences";
import { Button, cn, Field, InlineAlert, Segmented, Stepper, TextArea } from "@/components/ui";
import { api } from "@/lib/api";
import { isValidEmail } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { maskPhone } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { ROUTES } from "@/lib/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { SaasPlan } from "@/lib/types";

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
            <a href="#contact" className="hidden rounded-full px-4 py-2 text-muted hover:text-ink md:block">
              {copy.contactNav}
            </a>
            <Preferences />
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

        <section id="contact" className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <Reveal>
            <h2 className="display text-3xl font-semibold md:text-4xl">{copy.contactTitle}</h2>
            <p className="mt-3 max-w-md text-muted">{copy.contactText}</p>
            <ul className="mt-6 grid gap-3">
              {copy.contactPoints.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={100}>
            <ContactForm />
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
            <p>
              {copy.footer} © {new Date().getFullYear()} Turma Certa
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactForm() {
  const { t } = useI18n();
  const copy = t.landing.contactForm;
  const [form, setForm] = useState({ name: "", email: "", phone: "", school: "", message: "" });
  const [size, setSize] = useState({ students: 40, managers: 1, teachers: 3 });
  const [mode, setMode] = useState<SaasPlan>("school");
  const [withMessage, setWithMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });
  const valid = form.name.trim().length >= 2 && isValidEmail(form.email.trim()) && form.phone.replace(/\D/g, "").length >= 10 && form.school.trim().length >= 2;
  const school = mode === "school";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    try {
      await api("/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          school: form.school.trim(),
          mode,
          students: size.students,
          managers: school ? size.managers : 0,
          teachers: school ? size.teachers : 1,
          message: form.message.trim() || undefined,
        }),
      });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="grid justify-items-center gap-3 rounded-[2rem] border border-line bg-surface p-10 text-center shadow-soft">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
          <Check className="h-6 w-6" />
        </span>
        <p className="display text-xl font-semibold">{copy.sentTitle}</p>
        <p className="max-w-sm text-muted">{copy.sentText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-[2rem] border border-line bg-surface p-6 shadow-soft md:p-8">
      <Segmented
        label={copy.mode}
        value={mode}
        onChange={setMode}
        options={[
          { value: "school", label: copy.modeSchool },
          { value: "autonomous", label: copy.modeAutonomous },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={copy.name} value={form.name} onChange={set("name")} autoComplete="name" />
        <Field label={school ? copy.school : copy.business} value={form.school} onChange={set("school")} autoComplete="organization" />
        <Field label={copy.phone} inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: maskPhone(event.target.value) })} placeholder="(31) 99999-0000" autoComplete="tel" />
        <Field label={copy.email} type="email" inputMode="email" value={form.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div className={cn("grid gap-4", school ? "sm:grid-cols-3" : "sm:grid-cols-1")}>
        <Stepper label={copy.students} value={size.students} onChange={(students) => setSize({ ...size, students })} min={0} max={5000} step={10} />
        {school ? <Stepper label={copy.managers} value={size.managers} onChange={(managers) => setSize({ ...size, managers })} min={0} max={50} /> : null}
        {school ? <Stepper label={copy.teachers} value={size.teachers} onChange={(teachers) => setSize({ ...size, teachers })} min={0} max={200} /> : null}
      </div>
      {withMessage ? (
        <TextArea label={copy.message} optional value={form.message} onChange={set("message")} placeholder={copy.messagePlaceholder} autoFocus />
      ) : (
        <button type="button" onClick={() => setWithMessage(true)} className="justify-self-start text-sm font-semibold text-primary hover:underline">
          {copy.addMessage}
        </button>
      )}
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Button type="submit" size="lg" disabled={!valid} loading={sending}>
        {copy.submit}
        <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="text-xs text-muted">{copy.privacy}</p>
    </form>
  );
}
