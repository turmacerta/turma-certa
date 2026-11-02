"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/client-store";
import { useI18n } from "@/lib/i18n";
import { BALL_CENTER, BALL_SCALE, iconMotion, LOGO_INNER_ARC, LOGO_LIME, LOGO_OUTER_ARC, LOGO_PURPLE, LOGO_SPORTS, LOGO_T, LOGO_VIEWBOX, LogoBall, type LogoSport } from "./brand";
import { SportIcon } from "@/lib/sports";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const POP_AT = 1450;
const MOVE_EVERY = 2800;
const MOVE_FOR = 900;

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function easeOutBack(value: number) {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(value - 1, 3) + c * Math.pow(value - 1, 2);
}

function clamp(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function between(elapsed: number, start: number, duration: number) {
  return clamp((elapsed - start) / duration);
}

export function AnimatedLogo({ size = 320, label }: { size?: number; label: string }) {
  const [sport, setSport] = useState<LogoSport>("tennis");
  const recent = useRef<LogoSport[]>(["tennis"]);
  const cycle = () => {
    const options = LOGO_SPORTS.filter((item) => !recent.current.includes(item));
    const next = options[Math.floor(Math.random() * options.length)] ?? "tennis";
    recent.current = [next, ...recent.current].slice(0, 4);
    setSport(next);
  };
  const outerRef = useRef<SVGPathElement>(null);
  const innerRef = useRef<SVGPathElement>(null);
  const barRef = useRef<SVGRectElement>(null);
  const linkRef = useRef<SVGRectElement>(null);
  const letterRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<SVGGElement>(null);
  const startRef = useRef(0);
  const popRef = useRef(POP_AT);
  const sportRef = useRef(sport);

  useEffect(() => {
    if (sportRef.current !== sport && startRef.current) {
      popRef.current = performance.now() - startRef.current;
    }
    sportRef.current = sport;
  }, [sport]);

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
    letter.style.transformBox = "fill-box";
    letter.style.transformOrigin = "center";
    const { x, y } = BALL_CENTER;
    const S = BALL_SCALE;

    const render = (elapsed: number) => {
      outer.style.strokeDashoffset = `${outerLength * (1 - easeInOut(between(elapsed, 0, 820)))}`;
      inner.style.strokeDashoffset = `${innerLength * (1 - easeInOut(between(elapsed, 120, 820)))}`;
      link.setAttribute("height", `${340 * easeInOut(between(elapsed, 760, 260))}`);
      bar.setAttribute("width", `${799 * easeInOut(between(elapsed, 640, 520))}`);

      const stamp = between(elapsed, 980, 520);
      letter.style.opacity = `${clamp(stamp * 2.5)}`;
      letter.style.transform = `translateY(${(1 - stamp) * -70}px) scale(${stamp ? 1.22 - 0.22 * easeOutBack(stamp) : 1.22})`;

      const sincePop = elapsed - popRef.current;
      const pop = sincePop <= 0 ? 0 : easeOutBack(clamp(sincePop / 480));
      const cycleTime = sincePop - 700;
      const phase = cycleTime > 0 && cycleTime % MOVE_EVERY < MOVE_FOR ? (cycleTime % MOVE_EVERY) / MOVE_FOR : 0;
      const m = iconMotion(sportRef.current, phase);
      ball.style.opacity = pop > 0 ? "1" : "0";
      ball.setAttribute(
        "transform",
        [
          `translate(${x + m.dx * S + m.px * S} ${y + m.dy * S + m.py * S})`,
          `rotate(${m.angle})`,
          `scale(${pop * m.sx} ${pop * m.sy})`,
          `translate(${-x - m.px * S} ${-y - m.py * S})`,
        ].join(" "),
      );
    };

    if (prefersReducedMotion()) {
      render(POP_AT + 600);
      return;
    }

    let frame = 0;
    const start = performance.now();
    startRef.current = start;
    const tick = (now: number) => {
      render(now - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <button type="button" onClick={cycle} aria-label={label} title={label} className="group max-w-full cursor-pointer rounded-[3rem] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring">
      <svg viewBox={LOGO_VIEWBOX} width={size} height={size} aria-hidden className="max-w-full overflow-visible transition-transform group-active:scale-95">
        <g fill="none" stroke={LOGO_PURPLE} strokeWidth="97">
          <path ref={outerRef} d={LOGO_OUTER_ARC} />
          <path ref={innerRef} d={LOGO_INNER_ARC} />
        </g>
        <rect ref={barRef} x="940" y="252" width="0" height="95" fill={LOGO_PURPLE} />
        <rect ref={linkRef} x="861" y="1290" width="97" height="0" fill={LOGO_PURPLE} />
        <path ref={letterRef} fill={LOGO_LIME} fillRule="evenodd" d={LOGO_T} style={{ opacity: 0 }} />
        <g ref={ballRef} style={{ opacity: 0 }}>
          <LogoBall sport={sport} />
        </g>
      </svg>
    </button>
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
