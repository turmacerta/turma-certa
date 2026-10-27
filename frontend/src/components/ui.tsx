import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-clay text-white hover:bg-clay-dark",
    secondary: "bg-forest text-sand hover:bg-ink",
    ghost: "bg-transparent text-ink hover:bg-sand",
  }[variant];

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50",
        styles,
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-line bg-white/80 p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-forest">{label}</span>
      <input
        className="rounded-2xl border border-line bg-paper px-3 py-2.5 outline-none ring-clay/30 focus:ring-2"
        {...props}
      />
    </label>
  );
}

export function Badge({
  children,
  tone = "sand",
}: {
  children: ReactNode;
  tone?: "sand" | "clay" | "forest";
}) {
  const styles = {
    sand: "bg-sand text-forest",
    clay: "bg-clay/10 text-clay-dark",
    forest: "bg-forest/10 text-forest",
  }[tone];

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", styles)}>
      {children}
    </span>
  );
}

export function OccupancyBar({
  enrolled,
  capacity,
}: {
  enrolled: number;
  capacity: number;
}) {
  const ratio = capacity > 0 ? Math.min(enrolled / capacity, 1) : 0;
  const vacancies = Math.max(capacity - enrolled, 0);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {enrolled}/{capacity} alunos
        </span>
        <span>{vacancies === 0 ? "Turma cheia" : `${vacancies} vaga(s)`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand">
        <div
          className={cn("h-full rounded-full", vacancies === 0 ? "bg-forest" : "bg-clay")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center">
      <p className="display text-2xl">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted">{description}</p>
    </div>
  );
}
