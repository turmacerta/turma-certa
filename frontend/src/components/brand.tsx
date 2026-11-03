"use client";

import { useId } from "react";

export const LOGO_PURPLE = "#a32fd9";
export const LOGO_LIME = "#adf743";
export const LOGO_VIEWBOX = "176 96 1660 1660";
export const LOGO_OUTER_ARC = "M958 300 A716 666 0 0 0 958 1632";
export const LOGO_INNER_ARC = "M958 600 A388 366 0 0 0 958 1332";
export const LOGO_T = "M736 525H1739V929H1433V1680H1043V929H736ZM866 663V793H1172V1543H1302V793H1609V663Z";
export const BALL_CENTER = { x: 1000, y: 330 };
export const BALL_SCALE = 1.6;

export const LOGO_SPORTS = ["tennis", "soccer", "basketball", "volleyball", "racket", "boxing", "belt", "dumbbell", "target", "trophy", "star"] as const;

export type IconMotion = { dx: number; dy: number; angle: number; px: number; py: number; sx: number; sy: number };

const REST: IconMotion = { dx: 0, dy: 0, angle: 0, px: 0, py: 0, sx: 1, sy: 1 };

function ease(value: number) {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function iconMotion(sport: LogoSport, p: number): IconMotion {
  if (p <= 0 || p >= 1) return REST;
  const arc = Math.sin(Math.PI * p);
  const wave = Math.sin(2 * Math.PI * p);
  const landing = p > 0.86 ? Math.sin(((p - 0.86) / 0.14) * Math.PI) : 0;
  switch (sport) {
    case "tennis":
      return { ...REST, dy: -arc * 50, angle: ease(p) * 360, sx: 1 + landing * 0.1, sy: 1 - landing * 0.12 };
    case "soccer":
      return { ...REST, dx: wave * 14, dy: -arc * 56, angle: ease(p) * 360, sx: 1 + landing * 0.08, sy: 1 - landing * 0.1 };
    case "basketball":
      return { ...REST, dy: Math.abs(Math.sin(p * 3 * Math.PI)) * -36 * (1 - p * 0.6), angle: ease(p) * 360, sy: 1 - landing * 0.12, sx: 1 + landing * 0.08 };
    case "volleyball":
      return { ...REST, dy: -arc * 60, angle: -ease(p) * 360, sx: 1 + arc * 0.06, sy: 1 + arc * 0.06 };
    case "racket":
      return { ...REST, angle: -wave * 38, px: 64, py: 92 };
    case "boxing":
      return { ...REST, dx: arc * 34, angle: -arc * 14, sx: 1 + arc * 0.16, sy: 1 + arc * 0.16 };
    case "belt":
      return { ...REST, angle: wave * 10, py: -30, sy: 1 - arc * 0.06 };
    case "dumbbell":
      return { ...REST, dy: -arc * 44, angle: arc * 16, sy: 1 - landing * 0.08 };
    case "target":
      return { ...REST, sx: 1 + arc * 0.18, sy: 1 + arc * 0.18, angle: Math.sin(p * 6 * Math.PI) * 4 * (1 - p) };
    case "trophy":
      return { ...REST, dy: -arc * 34, sx: 1 + arc * 0.12, sy: 1 + arc * 0.12, angle: wave * 7 };
    case "star":
      return { ...REST, angle: ease(p) * 360, sx: 1 + arc * 0.22, sy: 1 + arc * 0.22 };
  }
}
export type LogoSport = (typeof LOGO_SPORTS)[number];

const RING = 14;

type BallSpec = { lines: string[]; width: number; fills?: string[] };

const VOLLEY = ["M0 0C4 -44 30 -78 72 -86", "M-32 -14C-32 -60 -8 -94 30 -106"];

const BALLS: Partial<Record<LogoSport, BallSpec>> = {
  tennis: { lines: ["M-100 -50Q-14 2 -32 112", "M64 -96Q20 -10 92 70"], width: 16 },
  soccer: {
    lines: ["M0 -40L0 -72", "M38 -12L68 -22", "M24 32L42 58", "M-24 32L-42 58", "M-38 -12L-68 -22"],
    width: 10,
    fills: [
      "M0 -40L38 -12L24 32L-24 32L-38 -12Z",
      "M0 -72L-38 -100L-24 -144L24 -144L38 -100Z",
      "M68 -22L83 -67L130 -67L145 -22L107 5Z",
      "M42 58L89 58L104 103L66 131L28 103Z",
      "M-42 58L-28 103L-66 131L-104 103L-89 58Z",
      "M-68 -22L-107 5L-145 -22L-130 -67L-83 -67Z",
    ],
  },
  basketball: { lines: ["M0 -110V110", "M-110 0H110", "M-78 -78Q-26 0 -78 78", "M78 -78Q26 0 78 78"], width: 12 },
  volleyball: { lines: [0, 120, 240].flatMap((angle) => VOLLEY.map((path) => `${path}|${angle}`)), width: 12 },
};

function Shape({ sport }: { sport: LogoSport }) {
  const outline = { stroke: LOGO_PURPLE, strokeWidth: RING, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const lime = { fill: LOGO_LIME, ...outline };
  const line = { fill: "none", ...outline };
  switch (sport) {
    case "boxing":
      return (
        <g>
          <path {...lime} d="M-54 -60C-54 -94 -24 -108 14 -108C68 -108 100 -74 100 -22C100 22 82 50 52 60V76H-60V50C-84 42 -100 22 -100 -4C-100 -30 -84 -46 -54 -46Z" />
          <rect {...lime} x="-66" y="72" width="124" height="36" rx="10" />
          <path {...line} d="M-54 -46C-54 -10 -36 8 -8 10" />
        </g>
      );
    case "racket":
      return (
        <g transform="rotate(-35) scale(1.12)">
          <rect {...lime} x="-16" y="46" width="32" height="64" rx="12" />
          <path {...line} d="M-16 70H16M-16 88H16" strokeWidth={8} />
          <path {...lime} d="M0 -110C44 -110 74 -76 74 -34C74 6 44 46 0 50C-44 46 -74 6 -74 -34C-74 -76 -44 -110 0 -110Z" />
          <g fill={LOGO_PURPLE}>
            {[-32, 0, 32].flatMap((x) => [-70, -38, -6].map((y) => <circle key={`${x}:${y}`} cx={x} cy={y} r="8" />))}
          </g>
        </g>
      );
    case "belt":
      return (
        <g>
          <path {...lime} d="M-14 4L-58 96L-22 110L10 20Z" />
          <path {...lime} d="M14 4L58 96L22 110L-10 20Z" />
          <path fill={LOGO_PURPLE} d="M-50 79L-58 96L-22 110L-15 93Z" />
          <path fill={LOGO_PURPLE} d="M50 79L58 96L22 110L15 93Z" />
          <rect {...lime} x="-108" y="-42" width="216" height="42" rx="12" />
          <rect {...lime} x="-28" y="-56" width="56" height="70" rx="12" />
          <path {...line} strokeWidth={8} d="M-28 -21H28" />
        </g>
      );
    case "dumbbell":
      return (
        <g transform="rotate(-35)" {...lime}>
          <rect x="-60" y="-12" width="120" height="24" rx="8" />
          <rect x="-108" y="-32" width="24" height="64" rx="8" />
          <rect x="-86" y="-52" width="32" height="104" rx="10" />
          <rect x="84" y="-32" width="24" height="64" rx="8" />
          <rect x="54" y="-52" width="32" height="104" rx="10" />
        </g>
      );
    case "star":
      return (
        <g>
          <path {...lime} d="M0 -102L27 -31L103 -27L44 20L63 93L0 52L-63 93L-44 20L-103 -27L-27 -31Z" />
        </g>
      );
    case "target":
      return (
        <g>
          <circle {...lime} r="104" />
          <circle fill={LOGO_PURPLE} r="72" />
          <circle fill={LOGO_LIME} r="50" />
          <circle fill={LOGO_PURPLE} r="20" />
        </g>
      );
    case "trophy":
      return (
        <g>
          <path {...line} d="M-58 -78H-90V-58C-90 -32 -74 -22 -54 -22M58 -78H90V-58C90 -32 74 -22 54 -22" />
          <path {...lime} d="M-60 -100H60V-44C60 -4 32 22 0 22C-32 22 -60 -4 -60 -44Z" />
          <rect {...lime} x="-12" y="22" width="24" height="40" />
          <rect {...lime} x="-50" y="62" width="100" height="36" rx="10" />
        </g>
      );
    default:
      return null;
  }
}

export function LogoBall({ sport, x = BALL_CENTER.x, y = BALL_CENTER.y, scale = BALL_SCALE }: { sport: LogoSport; x?: number; y?: number; scale?: number }) {
  const clip = useId();
  const spec = BALLS[sport];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {spec ? (
        <>
          <defs>
            <clipPath id={clip}>
              <circle r="110" />
            </clipPath>
          </defs>
          <circle r="110" fill={LOGO_LIME} />
          <g clipPath={`url(#${clip})`}>
            {(spec.fills ?? []).map((path) => (
              <path key={path} d={path} fill={LOGO_PURPLE} />
            ))}
            <g fill="none" stroke={LOGO_PURPLE} strokeWidth={spec.width} strokeLinecap="round">
              {spec.lines.map((line) => {
                const [path, angle] = line.split("|");
                return <path key={line} d={path} transform={angle ? `rotate(${angle})` : undefined} />;
              })}
            </g>
          </g>
          <circle r="110" fill="none" stroke={LOGO_PURPLE} strokeWidth={RING} />
        </>
      ) : (
        <Shape sport={sport} />
      )}
    </g>
  );
}

export function LogoMark({ className = "h-9 w-9", sport = "tennis", animated }: { className?: string; sport?: LogoSport; animated?: boolean }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} className={className} overflow="visible" aria-hidden>
      <g fill="none" stroke={LOGO_PURPLE} strokeWidth="97">
        <path d={LOGO_OUTER_ARC} />
        <path d={LOGO_INNER_ARC} />
      </g>
      <g fill={LOGO_PURPLE}>
        <rect x="940" y="252" width="799" height="95" />
        <rect x="861" y="1290" width="97" height="340" />
      </g>
      <path fill={LOGO_LIME} fillRule="evenodd" d={LOGO_T} />
      <g className={animated ? "logo-hop" : undefined}>
        <LogoBall sport={sport} />
      </g>
    </svg>
  );
}

export function BrandMark({ className = "", compact, sport }: { className?: string; compact?: boolean; sport?: LogoSport }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark sport={sport} />
      {compact ? null : <span className="display whitespace-nowrap text-xl font-bold">Turma Certa</span>}
    </span>
  );
}

export function LoadingMark({ label }: { label: string }) {
  return (
    <div role="status" aria-busy aria-label={label} className="grid justify-items-center gap-5">
      <LogoMark animated className="h-20 w-20" />
      <span className="display text-xl font-bold">Turma Certa</span>
      <span className="relative h-1 w-32 overflow-hidden rounded-full bg-line">
        <span className="loading-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-primary" />
      </span>
    </div>
  );
}

export function LogoSportPicker({ value, onChange, labels, label }: { value: LogoSport; onChange: (sport: LogoSport) => void; labels: Record<LogoSport, string>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      {LOGO_SPORTS.map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={item === value}
          aria-label={labels[item]}
          title={labels[item]}
          onClick={() => onChange(item)}
          className={`grid h-12 w-12 place-items-center rounded-full border-2 bg-surface transition hover:scale-105 ${item === value ? "border-primary shadow-soft" : "border-line"}`}
        >
          <svg viewBox="-125 -125 250 250" className="h-8 w-8" aria-hidden>
            <LogoBall sport={item} x={0} y={0} scale={1} />
          </svg>
        </button>
      ))}
    </div>
  );
}
