"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/client-store";
import { useI18n } from "@/lib/i18n";
import { LOGO_INNER_ARC, LOGO_LIME, LOGO_OUTER_ARC, LOGO_PURPLE, LOGO_SEAMS, LOGO_T, LOGO_VIEWBOX } from "./brand";
import { SPORTS, SportIcon } from "@/lib/sports";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function progress(elapsed: number, start: number, duration: number) {
  return easeOutCubic(Math.min(Math.max(elapsed - start, 0) / duration, 1));
}

const BALL_REST_Y = 435;

export function AnimatedLogo({ size = 320 }: { size?: number }) {
  const outerRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);
  const barRef = useRef<SVGRectElement>(null);
  const linkRef = useRef<SVGRectElement>(null);
  const letterRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    const bar = barRef.current;
    const link = linkRef.current;
    const letter = letterRef.current;
    const ball = ballRef.current;
    if (!outer || !inner || !bar || !link || !letter || !ball) {
      return;
    }
    const outerLength = outer.getTotalLength();
    const innerLength = inner.getTotalLength();
    outer.style.strokeDasharray = `${outerLength}`;
    inner.style.strokeDasharray = `${innerLength}`;

    const render = (elapsed: number) => {
      outer.style.strokeDashoffset = `${outerLength * (1 - progress(elapsed, 0, 900))}`;
      inner.style.strokeDashoffset = `${innerLength * (1 - progress(elapsed, 250, 900))}`;
      bar.setAttribute("width", `${799 * progress(elapsed, 700, 600)}`);
      link.setAttribute("height", `${390 * progress(elapsed, 900, 450)}`);

      const letterProgress = progress(elapsed, 1000, 650);
      letter.style.opacity = `${letterProgress}`;
      letter.style.transform = `translateY(${(1 - letterProgress) * 80}px)`;

      const ballTime = Math.max(elapsed - 1550, 0) / 1000;
      const fall = Math.max(1 - ballTime / 0.35, 0);
      const bounce = ballTime > 0.35 ? Math.abs(Math.sin((ballTime - 0.35) * Math.PI * 2.2)) * Math.exp(-(ballTime - 0.35) * 2.6) * 160 : 0;
      const idle = elapsed > 4600 ? Math.abs(Math.sin((elapsed - 4600) / 480)) * 22 : 0;
      const lift = fall * fall * 520 + bounce + idle;
      const spin = Math.min(ballTime, 1.6) * 260 + (elapsed > 4600 ? (elapsed - 4600) / 12 : 0);
      ball.style.opacity = elapsed > 1550 ? "1" : "0";
      ball.setAttribute("transform", `translate(0 ${-lift}) rotate(${spin} 908 ${BALL_REST_Y})`);
    };

    if (prefersReducedMotion()) {
      render(10_000);
      ball.setAttribute("transform", "");
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      render(now - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg viewBox={LOGO_VIEWBOX} width={size} height={size} aria-label="Turma Certa" role="img" className="max-w-full overflow-visible">
      <defs>
        <clipPath id="tc-animated-ball">
          <circle cx="908" cy={BALL_REST_Y} r="110" />
        </clipPath>
      </defs>
      <g fill="none" stroke={LOGO_PURPLE} strokeWidth="97">
        <path ref={outerRef} d={LOGO_OUTER_ARC} />
        <path ref={innerRef} d={LOGO_INNER_ARC} />
      </g>
      <rect ref={barRef} x="940" y="252" width="0" height="95" fill={LOGO_PURPLE} />
      <rect ref={linkRef} x="861" y="1290" width="97" height="0" fill={LOGO_PURPLE} />
      <path ref={letterRef} fill={LOGO_LIME} fillRule="evenodd" d={LOGO_T} style={{ opacity: 0 }} />
      <g ref={ballRef} style={{ opacity: 0 }}>
        <circle cx="908" cy={BALL_REST_Y} r="110" fill={LOGO_LIME} />
        <g clipPath="url(#tc-animated-ball)" fill="none" stroke={LOGO_PURPLE} strokeWidth="22">
          {LOGO_SEAMS.map((seam) => (
            <path key={seam} d={seam} />
          ))}
        </g>
      </g>
    </svg>
  );
}

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [seen, setSeen] = useState(false);
  const visible = seen || reduced;

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function CountUp({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [animated, setValue] = useState(0);
  const value = reduced ? to : animated;

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) {
      return;
    }
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        return;
      }
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = easeOutCubic(Math.min((now - start) / duration, 1));
        setValue(Math.round(to * progress));
        if (progress < 1) {
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to, duration, reduced]);

  return (
    <span ref={ref} className="tabular">
      {value}
      {suffix}
    </span>
  );
}

const DEMO_CLASSES = [
  { sport: "tennis", start: 2, end: 4, capacity: 4 },
  { sport: "beach_tennis", start: 2, end: 7, capacity: 8 },
  { sport: "footvolley", start: 3, end: 9, capacity: 10 },
] as const;

export function LiveClassesDemo() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [tick, setStep] = useState(0);
  const step = reduced ? 6 : tick;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || reduced) {
      return;
    }
    let timer = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) {
        return;
      }
      observer.disconnect();
      timer = window.setInterval(() => {
        setStep((current) => (current >= 6 ? 0 : current + 1));
      }, 900);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [reduced]);

  return (
    <div ref={ref} className="grid gap-3 rounded-[2rem] border border-line bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>{t.landing.demoTitle}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
          {t.landing.demoLive}
        </span>
      </div>
      {DEMO_CLASSES.map((item, index) => {
        const sportName = t.sports[item.sport];
        const level = t.landing.demoClasses[index]?.level ?? "";
        const enrolled = Math.min(item.start + Math.floor(((item.end - item.start) * step) / 6), item.capacity);
        const ratio = enrolled / item.capacity;
        return (
          <div key={item.sport} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-surface">
              <SportIcon name={sportName} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {sportName} · {level}
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
            </div>
            <span className="tabular w-12 text-right text-sm font-semibold">
              {enrolled}/{item.capacity}
            </span>
          </div>
        );
      })}
      <p className="text-xs text-muted">{step >= 3 ? t.landing.demoMakeup : t.landing.demoVacancy}</p>
    </div>
  );
}

export function SportsMarquee() {
  const { t } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || prefersReducedMotion()) {
      return;
    }
    let offset = 0;
    let frame = 0;
    let last = performance.now();
    let paused = false;
    const onEnter = () => {
      paused = true;
    };
    const onLeave = () => {
      paused = false;
    };
    track.addEventListener("mouseenter", onEnter);
    track.addEventListener("mouseleave", onLeave);
    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (!paused) {
        offset = (offset + delta * 0.04) % (track.scrollWidth / 2);
        track.style.transform = `translateX(${-offset}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      track.removeEventListener("mouseenter", onEnter);
      track.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const items = SPORTS.filter((sport) => sport.key !== "other");

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
      <div ref={trackRef} className="flex w-max gap-3 will-change-transform">
        {[...items, ...items].map((sport, index) => (
          <span
            key={`${sport.key}-${index}`}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium"
          >
            <SportIcon name={t.sports[sport.key]} className="h-4 w-4" />
            {t.sports[sport.key]}
          </span>
        ))}
      </div>
    </div>
  );
}
