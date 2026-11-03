import { normalize, shortTime, weekdayShort, type Locale } from "./format";
import type { Messages } from "./messages/pt-br";
import type { ClassRow, ClassSchedule } from "./types";

type ClassLike = Pick<ClassRow, "name" | "format"> & {
  sport?: { name: string } | null;
  class_level?: { name: string } | null;
  class_schedules?: ClassSchedule[];
};

export type Period = "morning" | "afternoon" | "evening";

export function autoClassName(t: Messages, sport?: string | null, level?: string | null, format?: string) {
  const parts = [sport ?? t.common.group];
  if (format === "private") {
    parts.push(t.common.private);
  } else if (level) {
    parts.push(level);
  }
  return parts.join(" · ");
}

export function classTitle(item: ClassLike, t: Messages) {
  return autoClassName(t, item.sport?.name, item.class_level?.name, item.format);
}

export function classNickname(item: ClassLike, t: Messages) {
  const clean = (value: string) => normalize(value.replace(/·/g, " ").replace(/\s+/g, " ").trim());
  const name = clean(item.name);
  const candidates = [classTitle(item, t), `${item.sport?.name ?? ""} ${item.class_level?.name ?? ""}`, `${item.sport?.name ?? ""} particular`, `${item.sport?.name ?? ""} private`].map(clean);
  return name && !candidates.some((candidate) => candidate === name || candidate.startsWith(name)) ? item.name : null;
}

export function scheduleSummary(schedules: ClassSchedule[] = [], locale: Locale, empty: string) {
  if (schedules.length === 0) {
    return empty;
  }
  const byTime = new Map<string, number[]>();
  for (const schedule of schedules) {
    const key = schedule.starts_at.slice(0, 5);
    byTime.set(key, [...(byTime.get(key) ?? []), schedule.weekday]);
  }
  return [...byTime.entries()]
    .map(([start, weekdays]) => `${weekdays.sort().map((day) => weekdayShort(day, locale)).join("/")} ${shortTime(start)}`)
    .join(" · ");
}

export function classOption(item: ClassRow, t: Messages, locale: Locale) {
  const full = item.occupancy.enrolled_count >= item.occupancy.max_capacity;
  return {
    value: item.id,
    label: classTitle(item, t),
    description: `${scheduleSummary(item.class_schedules, locale, t.common.noSchedule)} · ${item.occupancy.enrolled_count}/${item.occupancy.max_capacity}${full ? ` · ${t.classes.detail.waitlist}` : ""}`,
  };
}

export function periodOf(schedules: ClassSchedule[] = []): Period {
  const hour = Number(schedules[0]?.starts_at.slice(0, 2) ?? 0);
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function occupancyStatus(enrolled: number, capacity: number) {
  if (enrolled === 0) return "empty" as const;
  if (enrolled >= capacity) return "full" as const;
  if (enrolled / capacity < 0.5) return "low" as const;
  return "open" as const;
}

export type OccupancyStatus = ReturnType<typeof occupancyStatus>;

export const OCCUPANCY_TONES: Record<OccupancyStatus, "danger" | "warning" | "primary" | "success"> = {
  empty: "danger",
  low: "warning",
  open: "primary",
  full: "success",
};

export function levelLabel(level: { name: string; sport?: { name: string } | null } | null | undefined) {
  if (!level) {
    return "";
  }
  return level.sport ? `${level.sport.name} · ${level.name}` : level.name;
}
