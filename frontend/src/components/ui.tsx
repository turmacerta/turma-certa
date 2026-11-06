"use client";

import Image from "next/image";
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, CircleAlert, Eye, EyeOff, Inbox, Loader2, Minus, Plus, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "quiet-danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm disabled:bg-line disabled:text-muted disabled:shadow-none",
  secondary: "bg-primary-soft text-ink hover:brightness-95",
  ghost: "bg-transparent text-ink hover:bg-surface-2",
  outline: "border border-line bg-surface text-ink hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-95",
  "quiet-danger": "bg-transparent text-danger hover:bg-danger-soft",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    block?: boolean;
  }
>(function Button(
  { variant = "primary", size = "md", loading, block, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && "w-full",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:opacity-45",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className,
  interactive,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-3xl border border-line bg-surface p-5 shadow-soft",
        (interactive || onClick) &&
          "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </div>
  );
}

const CONTROL =
  "w-full rounded-2xl border bg-surface-2 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring disabled:opacity-60";

function OptionalTag() {
  const { t } = useI18n();
  return <span className="text-xs font-medium text-muted">{t.common.optional}</span>;
}

function FieldShell({
  label,
  hint,
  error,
  htmlFor,
  optional,
  hideLabel,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  htmlFor?: string;
  optional?: boolean;
  hideLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor={htmlFor} className={hideLabel ? "sr-only" : "flex items-center justify-between font-semibold text-ink"}>
        <span>{label}</span>
        {optional ? <OptionalTag /> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function useFieldId(id?: string) {
  const generated = useId();
  return id ?? generated;
}

export function Field({
  label,
  hint,
  error,
  optional,
  id,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
}) {
  const fieldId = useFieldId(id);
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} optional={optional}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error ? "border-danger" : "border-line", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function PasswordField({
  label,
  hint,
  error,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
}) {
  const fieldId = useFieldId(id);
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId}>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, "pr-11", error ? "border-danger" : "border-line")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-full text-muted hover:text-ink"
          aria-label={visible ? t.common.hidePassword : t.common.showPassword}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string; description?: string };

export function Select({
  label,
  hint,
  error,
  optional,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  searchable,
  hideLabel,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const fieldId = useFieldId();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
  const selected = options.find((option) => option.value === value);
  const filtered =
    searchable && query ? options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())) : options;

  function openList() {
    setQuery("");
    setHighlight(Math.max(options.findIndex((option) => option.value === value), 0));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !dropRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const measure = () => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom;
      const up = below < 300 && rect.top > below;
      setPlace(up ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 8 } : { left: rect.left, width: rect.width, top: rect.bottom + 8 });
    };
    measure();
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLElement>(`[data-index="${highlight}"]`)?.scrollIntoView({ block: "nearest" });
    }
  }, [highlight, open]);

  function choose(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) {
      return;
    }
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openList();
      return;
    }
    if (!open) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlight];
      if (option) {
        choose(option);
      }
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} optional={optional} hideLabel={hideLabel}>
      <div ref={ref} className="relative" onKeyDown={onKeyDown}>
        <button
          id={fieldId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openList())}
          className={cn(
            CONTROL,
            "flex items-center justify-between gap-2 text-left",
            error ? "border-danger" : open ? "border-primary ring-4 ring-ring" : "border-line hover:border-primary/40",
          )}
        >
          <span className={cn("truncate", !selected && "text-muted/70")}>{selected?.label ?? placeholder ?? t.common.select}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} />
        </button>
        {open && place ? createPortal(
          <div
            ref={dropRef}
            onKeyDown={onKeyDown}
            style={{ position: "fixed", left: place.left, width: Math.max(place.width, 192), top: place.top, bottom: place.bottom }}
            className="animate-scale-in z-[200] overflow-hidden rounded-2xl border border-line bg-surface shadow-soft"
          >
            {searchable ? (
              <div className="border-b border-line p-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlight(0);
                  }}
                  placeholder={t.common.search}
                  className="h-9 w-full rounded-xl bg-surface-2 px-3 text-sm outline-none placeholder:text-muted"
                />
              </div>
            ) : null}
            <ul ref={listRef} role="listbox" className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted">{t.common.nothingFound}</li>
              ) : (
                filtered.map((option, index) => {
                  const active = option.value === value;
                  return (
                    <li
                      key={option.value || "empty"}
                      data-index={index}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        choose(option);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                        index === highlight && "bg-surface-2",
                        active && "font-semibold text-primary",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.description ? (
                          <span className="block truncate text-xs font-normal text-muted">{option.description}</span>
                        ) : null}
                      </span>
                      {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        ) : null}
      </div>
    </FieldShell>
  );
}

const TIME_OPTIONS: SelectOption[] = Array.from({ length: 37 }, (_, index) => {
  const minutes = 5 * 60 + index * 30;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return { value, label: value };
});

export function TimeSelect({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return <Select label={label} value={value} onChange={onChange} options={TIME_OPTIONS} error={error} />;
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  hint,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: ReactNode;
  suffix?: string;
}) {
  const fieldId = useFieldId();
  const { t } = useI18n();
  const clamp = (next: number) => Math.min(Math.max(next, min), max);
  return (
    <FieldShell label={label} hint={hint} htmlFor={fieldId}>
      <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface-2 p-1">
        <button
          type="button"
          aria-label={t.common.decrease}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface disabled:opacity-35"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          id={fieldId}
          inputMode="numeric"
          value={value}
          onChange={(event) => {
            const parsed = Number(event.target.value.replace(/\D/g, ""));
            onChange(clamp(Number.isFinite(parsed) ? parsed : min));
          }}
          className="tabular h-9 min-w-0 flex-1 bg-transparent text-center text-sm font-semibold outline-none"
        />
        {suffix ? <span className="pr-1 text-xs text-muted">{suffix}</span> : null}
        <button
          type="button"
          aria-label={t.common.increase}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="grid h-9 w-9 place-items-center rounded-xl text-ink transition hover:bg-surface disabled:opacity-35"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </FieldShell>
  );
}

export function TextArea({
  label,
  hint,
  error,
  optional,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
}) {
  const fieldId = useFieldId(id);
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={fieldId} optional={optional}>
      <textarea
        id={fieldId}
        className={cn(CONTROL, "min-h-24", error ? "border-danger" : "border-line", className)}
        {...props}
      />
    </FieldShell>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  description,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: ReactNode;
}) {
  return (
    <label className="group flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition peer-focus-visible:ring-4 peer-focus-visible:ring-ring",
          checked ? "border-primary bg-primary text-on-primary" : "border-line bg-surface group-hover:border-primary/50",
        )}
      >
        {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="block text-xs text-muted">{description}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-4 peer-focus-visible:ring-ring",
          checked ? "bg-primary" : "bg-line",
        )}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </label>
  );
}

export function Tooltip({
  label,
  children,
  side = "top",
  disabled,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "bottom-end";
  disabled?: boolean;
}) {
  if (disabled) {
    return <>{children}</>;
  }
  const position = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    "bottom-end": "top-full right-0 mt-2",
    right: "left-full top-1/2 ml-3 -translate-y-1/2",
  }[side];
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none invisible absolute z-50 w-max max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-semibold text-bg opacity-0 shadow-soft transition delay-100 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100",
          position,
        )}
      >
        {label}
      </span>
    </span>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="mx-auto flex w-full flex-col items-center justify-center gap-3 rounded-3xl border border-danger/20 bg-surface px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold">{t.common.loadFailedTitle}</p>
        <p className="mt-1 max-w-sm text-balance text-sm text-muted">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          {t.common.retry}
        </Button>
      ) : null}
    </div>
  );
}

type BadgeTone =
  | "neutral"
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-muted border border-line",
  primary: "bg-primary-soft text-ink",
  accent: "bg-accent-soft text-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function OccupancyBar({
  enrolled,
  capacity,
  compact,
}: {
  enrolled: number;
  capacity: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const ratio = capacity > 0 ? Math.min(enrolled / capacity, 1) : 0;
  const vacancies = Math.max(capacity - enrolled, 0);
  const tone =
    enrolled === 0 ? "bg-danger" : vacancies === 0 ? "bg-success" : ratio < 0.5 ? "bg-warning" : "bg-primary";

  return (
    <div className="grid gap-1.5">
      {compact ? null : (
        <div className="flex items-center justify-between text-xs text-muted">
          <span className="tabular">
            {t.classes.occupancyText(enrolled, capacity)}
          </span>
          <span>
            {enrolled === 0
              ? t.classes.emptyClass
              : vacancies === 0
                ? t.classes.fullClass
                : t.common.vacancies(vacancies)}
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={enrolled} aria-valuemax={capacity}>
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${Math.max(ratio * 100, enrolled > 0 ? 6 : 0)}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  inset,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-center justify-center text-center",
        inset ? "flex-1 px-4 py-8" : "rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-10",
      )}
    >
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary [&_svg]:h-5 [&_svg]:w-5">
        {icon ?? <Inbox />}
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 max-w-sm text-balance text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary dark:text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="display mt-1 text-3xl font-semibold md:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "primary" | "warning" | "danger" | "success";
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const dot = {
    neutral: "bg-line",
    primary: "bg-primary",
    warning: "bg-warning",
    danger: "bg-danger",
    success: "bg-success",
  }[tone];
  return (
    <Card onClick={onClick} className="grid gap-2">
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        <span>{label}</span>
        {icon ? <span className="ml-auto text-muted">{icon}</span> : null}
      </div>
      <p className="display tabular truncate text-2xl font-semibold text-ink sm:text-3xl">{value}</p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function LoadingList({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3" aria-busy aria-label={t.common.loading}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-surface p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full font-semibold transition",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              active ? "bg-primary text-on-primary shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {option.icon}
            <span className={option.icon ? "hidden sm:inline" : undefined}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-line [scrollbar-width:none]">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition",
              active ? "border-primary text-ink dark:border-accent" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="tabular rounded-full bg-surface-2 px-1.5 text-xs text-muted">{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const sizes = { sm: "h-7 w-7 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-14 w-14 text-lg" }[size];
  if (src) {
    return <Image src={src} alt="" aria-hidden width={112} height={112} unoptimized className={cn("shrink-0 rounded-full object-cover", sizes)} />;
  }
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary dark:text-accent", sizes)}
    >
      {initials || "?"}
    </span>
  );
}

export function CodeInput({
  length,
  value,
  onChange,
  disabled,
  label,
  onComplete,
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  onComplete?: (value: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const current = Math.min(value.length, length - 1);

  useEffect(() => {
    if (!disabled) {
      ref.current?.focus();
    }
  }, [disabled]);

  return (
    <div
      className={cn("relative flex justify-center gap-2", disabled && "opacity-60")}
      onClick={() => ref.current?.focus()}
    >
      <input
        ref={ref}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        aria-label={label}
        value={value}
        maxLength={length}
        disabled={disabled}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, length);
          onChange(next);
          if (next.length === length) {
            onComplete?.(next);
          }
        }}
      />
      {Array.from({ length }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "display tabular grid h-14 w-11 place-items-center rounded-2xl border-2 bg-surface-2 text-2xl font-bold transition sm:w-12",
            value[index] ? "border-primary dark:border-accent" : "border-line",
            focused && index === current && !disabled && "ring-4 ring-ring",
          )}
        >
          {value[index] ?? ""}
        </span>
      ))}
    </div>
  );
}

export function InlineAlert({
  tone = "info",
  title,
  children,
  action,
}: {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    info: "border-primary/25 bg-primary-soft",
    success: "border-success/30 bg-success-soft",
    warning: "border-warning/30 bg-warning-soft",
    danger: "border-danger/30 bg-danger-soft",
  }[tone];
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm", tones)} role={tone === "danger" ? "alert" : "status"}>
      <div>
        {title ? <p className="font-semibold text-ink">{title}</p> : null}
        {children ? <div className="text-muted">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function MockBadge() {
  const { t } = useI18n();
  return (
    <Badge tone="warning" className="uppercase tracking-wider">
      {t.common.preview}
    </Badge>
  );
}
