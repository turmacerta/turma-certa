"use client";

import { Columns3, LayoutGrid, List, Search, Table2, X, CalendarRange, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn, IconButton, Segmented } from "./ui";

export type ViewMode = "cards" | "list" | "table" | "board" | "week" | "day";

const VIEW_ICONS: Record<ViewMode, ReactNode> = {
  cards: <LayoutGrid className="h-4 w-4" />,
  list: <List className="h-4 w-4" />,
  table: <Table2 className="h-4 w-4" />,
  board: <Columns3 className="h-4 w-4" />,
  week: <CalendarRange className="h-4 w-4" />,
  day: <CalendarDays className="h-4 w-4" />,
};

export function ViewSwitcher<T extends ViewMode>({
  value,
  onChange,
  modes,
}: {
  value: T;
  onChange: (value: T) => void;
  modes: readonly T[];
}) {
  const { t } = useI18n();
  return (
    <Segmented
      label={t.common.viewMode}
      value={value}
      onChange={onChange}
      size="sm"
      options={modes.map((mode) => ({ value: mode, label: t.common.views[mode], icon: VIEW_ICONS[mode] }))}
    />
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? t.common.search}
        aria-label={placeholder ?? t.common.search}
        className="h-10 w-full rounded-full border border-line bg-surface pl-10 pr-9 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-ring"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t.common.clearSearch}
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function FilterChips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
              active ? "border-primary bg-primary-soft text-ink" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className="tabular opacity-70">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

export function DataTable({
  columns,
  children,
}: {
  columns: Array<{ label: string; className?: string }>;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
            {columns.map((column) => (
              <th key={column.label} className={cn("px-4 py-3 font-semibold", column.className)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const PAGE_SIZE = 10;

export function usePaged<T>(items: T[], resetKey = "") {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(state.key === resetKey ? state.page : 1, pages);
  return {
    items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    page,
    pages,
    total: items.length,
    setPage: (next: number) => setState({ key: resetKey, page: next }),
  };
}

export function Pagination({ page, pages, total, setPage }: { page: number; pages: number; total: number; setPage: (page: number) => void }) {
  const { t } = useI18n();
  if (pages <= 1) {
    return null;
  }
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <nav aria-label={t.common.pagination} className="flex items-center justify-between gap-3 text-sm">
      <span className="tabular text-muted">{t.common.pageRange(from, to, total)}</span>
      <span className="flex items-center gap-1">
        <IconButton label={t.common.previous} className="h-9 w-9 border border-line" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <span className="tabular min-w-12 text-center font-semibold">
          {page}/{pages}
        </span>
        <IconButton label={t.common.next} className="h-9 w-9 border border-line" disabled={page >= pages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </span>
    </nav>
  );
}
