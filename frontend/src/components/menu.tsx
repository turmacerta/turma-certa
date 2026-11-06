"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./ui";

export function Menu({
  trigger,
  children,
  align = "right",
  width = "w-64",
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  width?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "animate-scale-in absolute top-full z-40 mt-2 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-soft",
            align === "right" ? "right-0" : "left-0",
            width,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  icon,
  children,
  onClick,
  tone = "default",
  active,
  hint,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  active?: boolean;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-surface-2",
        tone === "danger" ? "text-danger" : "text-ink",
        active && "bg-primary-soft",
      )}
    >
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint ? <span className="shrink-0 text-xs text-muted">{hint}</span> : null}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">{children}</p>;
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line" />;
}
