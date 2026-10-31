import type { SVGProps } from "react";
import { Bike, Dumbbell, Footprints, Trophy, Volleyball, Waves } from "lucide-react";
import { normalize } from "./format";
import { en } from "./messages/en";
import { ptBR } from "./messages/pt-br";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

function TennisBall(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6c3.1 3.1 3.1 9.7 0 12.8" />
      <path d="M18.4 5.6c-3.1 3.1-3.1 9.7 0 12.8" />
    </Base>
  );
}

function Racket(props: IconProps) {
  return (
    <Base {...props}>
      <ellipse cx="14.5" cy="9.5" rx="5.5" ry="6.5" transform="rotate(45 14.5 9.5)" />
      <path d="m10.6 13.4-6.1 6.1" />
      <path d="m3.5 18.5 2 2" />
      <circle cx="5.5" cy="6" r="1.6" />
    </Base>
  );
}

function Paddle(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="8" y="2.5" width="11" height="12" rx="5.5" transform="rotate(35 13.5 8.5)" />
      <path d="m9.2 14.3-4.7 6.2" />
      <circle cx="18.5" cy="18.5" r="2" />
    </Base>
  );
}

function SoccerBall(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 3.4 2.5-1.3 4h-4.2l-1.3-4Z" />
      <path d="M12 7.5V3.2M15.4 10l4.1-1.4M14.1 14l2.5 3.6M9.9 14l-2.5 3.6M8.6 10 4.5 8.6" />
    </Base>
  );
}

function Basketball(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18" />
      <path d="M5.6 5.6a12 12 0 0 1 0 12.8M18.4 5.6a12 12 0 0 0 0 12.8" />
    </Base>
  );
}

function BoxingGlove(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M7 14V8.5A5.5 5.5 0 0 1 12.5 3h.5a5 5 0 0 1 5 5v4a4 4 0 0 1-4 4H9" />
      <path d="M7 11.5a3 3 0 0 1 3-3h3" />
      <path d="M6 16h10v3.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 6 19.5Z" />
    </Base>
  );
}

function Belt(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.5 10.5h19v3h-19Z" />
      <path d="M10 10.5 8 20M14 10.5l2 9.5" />
      <rect x="9.5" y="9" width="5" height="6" rx="1" />
    </Base>
  );
}

function Kettlebell(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9 9.5V7.5a3 3 0 0 1 6 0v2" />
      <path d="M6.5 15a5.5 5.5 0 0 1 11 0v4.5a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5Z" />
    </Base>
  );
}

function Lotus(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 20c-4.5 0-8-2-9-5 3 0 5.5 1 7 3" />
      <path d="M12 20c4.5 0 8-2 9-5-3 0-5.5 1-7 3" />
      <path d="M12 20c-2.5-2-3.5-5-3.5-8S10 6 12 4c2 2 3.5 5 3.5 8s-1 6-3.5 8Z" />
    </Base>
  );
}

function Skateboard(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 11.5h18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 11.5Z" />
      <circle cx="7" cy="16.5" r="1.6" />
      <circle cx="17" cy="16.5" r="1.6" />
    </Base>
  );
}

function Surfboard(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M19.5 4.5c-6 0-15 9-15 15 6 0 15-9 15-15Z" />
      <path d="m8 16 8-8" />
    </Base>
  );
}

function GolfFlag(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M8 21V3l9 4-9 4" />
      <ellipse cx="9" cy="21" rx="5" ry="1" />
    </Base>
  );
}

function Shuttlecock(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="7" cy="17" r="3" />
      <path d="m9 15 9-9M9.5 16.5 20 9M7.5 14.5 15 4" />
      <path d="M15 4c2 0 5 3 5 5" />
    </Base>
  );
}

function Dance(props: IconProps) {
  return (
    <Base {...props}>
      <circle cx="13" cy="4" r="1.8" />
      <path d="m9 21 3-6 3 2v4M12 15l-1-5 4-1 3 3M11 10 7 12" />
    </Base>
  );
}

export type SportKey =
  | "tennis"
  | "beach_tennis"
  | "padel"
  | "badminton"
  | "soccer"
  | "futsal"
  | "footvolley"
  | "volleyball"
  | "basketball"
  | "handball"
  | "swimming"
  | "boxing"
  | "muay_thai"
  | "jiu_jitsu"
  | "judo"
  | "karate"
  | "functional"
  | "crossfit"
  | "running"
  | "cycling"
  | "yoga"
  | "pilates"
  | "dance"
  | "skate"
  | "surf"
  | "golf"
  | "other";

export type SportMeta = {
  key: SportKey;
  icon: (props: IconProps) => React.ReactElement;
  color: string;
  match: string[];
};

const lucide = (Icon: typeof Bike) =>
  function LucideSport(props: IconProps) {
    return <Icon className={props.className} strokeWidth={1.8} aria-hidden />;
  };

export const SPORTS: SportMeta[] = [
  { key: "tennis", icon: TennisBall, color: "#9ccc2b", match: ["tenis", "tennis"] },
  { key: "beach_tennis", icon: Racket, color: "#e9a23b", match: ["beach"] },
  { key: "padel", icon: Paddle, color: "#3fb6a8", match: ["padel"] },
  { key: "badminton", icon: Shuttlecock, color: "#7aa5e8", match: ["badminton"] },
  { key: "soccer", icon: SoccerBall, color: "#3a9d5d", match: ["futebol", "soccer", "society"] },
  { key: "futsal", icon: SoccerBall, color: "#4f8fd6", match: ["futsal"] },
  { key: "footvolley", icon: lucide(Volleyball), color: "#e58a4e", match: ["futevolei", "footvolley"] },
  { key: "volleyball", icon: lucide(Volleyball), color: "#e6b33a", match: ["volei", "volley"] },
  { key: "basketball", icon: Basketball, color: "#e2763b", match: ["basquete", "basket"] },
  { key: "handball", icon: lucide(Volleyball), color: "#c96a9b", match: ["handebol", "handball"] },
  { key: "swimming", icon: lucide(Waves), color: "#3fa7d6", match: ["natacao", "swim", "hidro"] },
  { key: "boxing", icon: BoxingGlove, color: "#d9535b", match: ["boxe", "box"] },
  { key: "muay_thai", icon: BoxingGlove, color: "#c8463f", match: ["muay", "kick"] },
  { key: "jiu_jitsu", icon: Belt, color: "#6c63d9", match: ["jiu", "bjj"] },
  { key: "judo", icon: Belt, color: "#5a7bd8", match: ["judo"] },
  { key: "karate", icon: Belt, color: "#8a5bd6", match: ["karate", "taekwondo"] },
  { key: "functional", icon: Kettlebell, color: "#7a5af8", match: ["funcional", "functional", "hiit"] },
  { key: "crossfit", icon: lucide(Dumbbell), color: "#5b5f73", match: ["cross", "muscula"] },
  { key: "running", icon: lucide(Footprints), color: "#e0655f", match: ["corrida", "running", "atletismo"] },
  { key: "cycling", icon: lucide(Bike), color: "#4aa37f", match: ["ciclismo", "bike", "spinning", "bicic"] },
  { key: "yoga", icon: Lotus, color: "#b07ad9", match: ["yoga", "ioga"] },
  { key: "pilates", icon: Lotus, color: "#d98bb3", match: ["pilates"] },
  { key: "dance", icon: Dance, color: "#e0679c", match: ["danca", "dance", "ballet", "zumba"] },
  { key: "skate", icon: Skateboard, color: "#7d8597", match: ["skate"] },
  { key: "surf", icon: Surfboard, color: "#2fa3b8", match: ["surf", "stand up"] },
  { key: "golf", icon: GolfFlag, color: "#5aa25a", match: ["golf"] },
  { key: "other", icon: lucide(Trophy), color: "#8a8599", match: [] },
];

const OTHER = SPORTS[SPORTS.length - 1];

export function sportMeta(name: string | null | undefined): SportMeta {
  if (!name) {
    return OTHER;
  }
  const value = normalize(name);
  const exact = SPORTS.find((sport) => normalize(ptBR.sports[sport.key]) === value || normalize(en.sports[sport.key]) === value);
  if (exact) {
    return exact;
  }
  return SPORTS.find((sport) => sport.match.some((term) => value.includes(term))) ?? OTHER;
}

export function SportIcon({
  name,
  className = "h-5 w-5",
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const meta = sportMeta(name);
  const Icon = meta.icon;
  return <Icon className={className} />;
}

export function SportBadge({
  name,
  size = "md",
}: {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
}) {
  const meta = sportMeta(name);
  const Icon = meta.icon;
  const box = { sm: "h-8 w-8 rounded-xl", md: "h-10 w-10 rounded-2xl", lg: "h-14 w-14 rounded-2xl" }[size];
  const icon = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" }[size];
  return (
    <span
      className={`grid shrink-0 place-items-center bg-surface-2 text-ink ${box}`}
      aria-hidden
    >
      <Icon className={icon} />
    </span>
  );
}
