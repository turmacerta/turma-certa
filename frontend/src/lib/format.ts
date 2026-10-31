export type Locale = "pt-BR" | "en";

function toDate(value: Date | string) {
  if (typeof value !== "string") {
    return value;
  }
  return new Date(value.length === 10 ? `${value}T12:00:00` : value);
}

export function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCurrency(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function formatDate(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short" }).format(toDate(value));
}

export function formatLongDate(value: Date | string, locale: Locale) {
  return capitalizeFirst(new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(toDate(value)));
}

export function formatTime(value: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(toDate(value));
}

export function formatRange(start: Date, end: Date, locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function weekdayShort(weekday: number, locale: Locale) {
  const sunday = new Date(2024, 0, 7 + weekday);
  return capitalizeFirst(new Intl.DateTimeFormat(locale, { weekday: "short" }).format(sunday).replace(".", ""));
}

export function weekdayLong(weekday: number, locale: Locale) {
  const sunday = new Date(2024, 0, 7 + weekday);
  return capitalizeFirst(new Intl.DateTimeFormat(locale, { weekday: "long" }).format(sunday));
}

export function dateKey(value: Date | string) {
  const date = toDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function daysUntil(value: string) {
  const target = toDate(value);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  target.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function relativeDay(value: string, locale: Locale) {
  const days = daysUntil(value);
  if (Math.abs(days) < 7) {
    return capitalizeFirst(new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(days, "day"));
  }
  return formatDate(value, locale);
}

export function hoursBetween(start: string, end: string) {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  return Math.max((endHours * 60 + endMinutes - (startHours * 60 + startMinutes)) / 60, 0);
}

export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function shortTime(value: string) {
  const [hours, minutes] = value.split(":");
  return minutes === "00" ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}
