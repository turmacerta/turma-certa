/** Brazil no longer observes DST; America/Sao_Paulo is permanently UTC-3. */
export const TIMEZONE = "America/Sao_Paulo";
export const HORIZON_DAYS = 14;

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export type BrtParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

export function brtParts(date = new Date()): BrtParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY[parts.weekday ?? "Sun"] ?? 0,
  };
}

/** Instant for a wall-clock time in America/Sao_Paulo. */
export function brtToUtc(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const asBrt = new Date(utcGuess.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const asUtc = new Date(utcGuess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(utcGuess.getTime() + (asUtc.getTime() - asBrt.getTime()));
}

export function startOfBrtDay(date = new Date()) {
  const parts = brtParts(date);
  return brtToUtc(parts.year, parts.month, parts.day, 0, 0, 0);
}

export function addBrtDays(date: Date, days: number) {
  const parts = brtParts(date);
  const noon = brtToUtc(parts.year, parts.month, parts.day, 12, 0, 0);
  noon.setUTCDate(noon.getUTCDate() + days);
  const shifted = brtParts(noon);
  return brtToUtc(shifted.year, shifted.month, shifted.day, 0, 0, 0);
}

/** Exclusive upper bound: start of (today + HORIZON_DAYS + 1) in BRT. */
export function horizonEndExclusive(now = new Date()) {
  return addBrtDays(startOfBrtDay(now), HORIZON_DAYS + 1);
}

export function brtWallTime(date: Date, time: string) {
  const parts = brtParts(date);
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return brtToUtc(parts.year, parts.month, parts.day, hours ?? 0, minutes ?? 0, seconds ?? 0);
}

export function brtDateKey(date: Date) {
  const parts = brtParts(date);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Milliseconds until the next midnight in America/Sao_Paulo. */
export function msUntilNextBrtMidnight(now = new Date()) {
  const next = addBrtDays(startOfBrtDay(now), 1);
  return Math.max(1000, next.getTime() - now.getTime());
}
