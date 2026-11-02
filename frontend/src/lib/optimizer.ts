import { periodOf } from "./classes";
import type { ClassRow, ClassSchedule } from "./types";

export type MergeSuggestion = {
  source: ClassRow;
  target: ClassRow;
  moving: number;
  enrolledAfter: number;
  freedHours: number;
  samePeriod: boolean;
};

const LOW_OCCUPANCY = 0.6;

function weeklyHours(schedules: ClassSchedule[]) {
  return schedules.reduce((sum, schedule) => {
    const [startHours = 0, startMinutes = 0] = schedule.starts_at.split(":").map(Number);
    const [endHours = 0, endMinutes = 0] = schedule.ends_at.split(":").map(Number);
    return sum + (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60;
  }, 0);
}

function occupancy(item: ClassRow) {
  return item.occupancy.max_capacity ? item.occupancy.enrolled_count / item.occupancy.max_capacity : 1;
}

function groupKey(item: ClassRow) {
  return `${item.sport?.id ?? ""}|${item.class_level?.id ?? ""}|${item.unit?.id ?? ""}`;
}

function compare(a: MergeSuggestion, b: MergeSuggestion) {
  return (
    Number(b.samePeriod) - Number(a.samePeriod) ||
    b.freedHours - a.freedHours ||
    a.moving - b.moving ||
    b.enrolledAfter / b.target.occupancy.max_capacity - a.enrolledAfter / a.target.occupancy.max_capacity ||
    a.source.id.localeCompare(b.source.id) ||
    a.target.id.localeCompare(b.target.id)
  );
}

export function suggestMerges(classes: ClassRow[]): MergeSuggestion[] {
  const candidates = classes.filter((item) => item.format === "group" && item.sport && item.class_schedules.length > 0);
  const groups = new Map<string, ClassRow[]>();
  for (const item of candidates) {
    groups.set(groupKey(item), [...(groups.get(groupKey(item)) ?? []), item]);
  }

  const options: MergeSuggestion[] = [];
  for (const group of groups.values()) {
    for (const source of group) {
      if (occupancy(source) >= LOW_OCCUPANCY) {
        continue;
      }
      for (const target of group) {
        if (target.id === source.id) {
          continue;
        }
        const enrolledAfter = target.occupancy.enrolled_count + source.occupancy.enrolled_count;
        if (enrolledAfter > target.occupancy.max_capacity) {
          continue;
        }
        if (source.occupancy.enrolled_count > target.occupancy.enrolled_count) {
          continue;
        }
        options.push({
          source,
          target,
          moving: source.occupancy.enrolled_count,
          enrolledAfter,
          freedHours: weeklyHours(source.class_schedules),
          samePeriod: periodOf(source.class_schedules) === periodOf(target.class_schedules),
        });
      }
    }
  }

  const used = new Set<string>();
  const picked: MergeSuggestion[] = [];
  for (const option of options.sort(compare)) {
    if (used.has(option.source.id) || used.has(option.target.id)) {
      continue;
    }
    used.add(option.source.id);
    used.add(option.target.id);
    picked.push(option);
  }
  return picked;
}
